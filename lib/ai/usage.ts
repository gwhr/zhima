import { db } from "@/lib/db";
import type { AiTaskType } from "@prisma/client";
import { getPlatformConfig } from "@/lib/system-config";
import { getModelPricing } from "@/lib/model-catalog-config";

interface UsageParams {
  userId: string;
  workspaceId: string;
  taskType: AiTaskType;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

const FALLBACK_USER_TOKEN_BUDGET = 500_000;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getDefaultUserTokenBudget(): number {
  return parsePositiveInt(
    process.env.DEFAULT_USER_TOKEN_BUDGET,
    FALLBACK_USER_TOKEN_BUDGET
  );
}

export async function getEffectiveUserTokenBudget(userId: string): Promise<number> {
  let tokenBudget = getDefaultUserTokenBudget();
  try {
    const config = await getPlatformConfig();
    tokenBudget = config.defaultUserTokenBudget;
  } catch {
    // Use env fallback when config storage is not ready yet.
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { tokenBudgetOverride: true },
    });
    if (
      typeof user?.tokenBudgetOverride === "number" &&
      Number.isFinite(user.tokenBudgetOverride) &&
      user.tokenBudgetOverride > 0
    ) {
      return Math.floor(user.tokenBudgetOverride);
    }
  } catch {
    // Ignore user-level lookup failures and fallback to platform default.
  }

  return tokenBudget;
}

export async function recordUsage(params: UsageParams) {
  const costs = await getModelPricing(params.modelId);
  const costYuan =
    (params.inputTokens / 1_000_000) * costs.input +
    (params.outputTokens / 1_000_000) * costs.output;

  await db.$transaction([
    db.aiUsageLog.create({
      data: {
        userId: params.userId,
        workspaceId: params.workspaceId,
        taskType: params.taskType,
        model: params.modelId,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costYuan,
        durationMs: params.durationMs,
      },
    }),
    ...(params.modelId === "opus"
      ? [
          db.userQuota.update({
            where: {
              userId_workspaceId: {
                userId: params.userId,
                workspaceId: params.workspaceId,
              },
            },
            data: { opusUsed: { increment: costYuan } },
          }),
        ]
      : []),
  ]);

  return costYuan;
}

export async function getUserTokenSummary(userId: string) {
  const tokenBudget = await getEffectiveUserTokenBudget(userId);

  const aggregated = await db.aiUsageLog.aggregate({
    where: { userId },
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
  });

  const inputTokens = aggregated._sum.inputTokens ?? 0;
  const outputTokens = aggregated._sum.outputTokens ?? 0;
  const tokenUsed = inputTokens + outputTokens;

  return {
    tokenBudget,
    tokenUsed,
    tokenRemaining: Math.max(0, tokenBudget - tokenUsed),
    inputTokens,
    outputTokens,
  };
}

export async function ensureUserTokenQuota(
  userId: string,
  reserveTokens: number,
  taskLabel = "当前操作"
) {
  const summary = await getUserTokenSummary(userId);
  if (summary.tokenRemaining < reserveTokens) {
    throw new Error(
      `${taskLabel}所需 Token 不足。当前剩余 ${summary.tokenRemaining}，至少需要 ${reserveTokens}。`
    );
  }
  return summary;
}

export async function getQuotaStatus(userId: string, workspaceId: string) {
  const quota = await db.userQuota.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (!quota) return null;

  return {
    opusBudget: Number(quota.opusBudget),
    opusUsed: Number(quota.opusUsed),
    opusRemaining: Number(quota.opusBudget) - Number(quota.opusUsed),
    modifyLimit: quota.modifyLimit,
    modifyUsed: quota.modifyUsed,
    modifyRemaining: quota.modifyLimit - quota.modifyUsed,
    previewLimit: quota.previewLimit,
    previewUsed: quota.previewUsed,
    previewRemaining: quota.previewLimit - quota.previewUsed,
  };
}
