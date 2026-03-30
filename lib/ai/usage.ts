import { db } from "@/lib/db";
import type { AiTaskType } from "@prisma/client";
import { getPlatformConfig } from "@/lib/system-config";
import { getModelPricing } from "@/lib/model-catalog-config";
import {
  ensureWalletCanReserve,
  getUserWalletSummary,
  settleTokenReservation,
} from "@/lib/billing/token-wallet";

interface UsageParams {
  userId: string;
  workspaceId: string;
  taskType: AiTaskType;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens?: number;
  durationMs: number;
  reservationId?: string;
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
  if (!params.reservationId) {
    const pricing = await getModelPricing(params.modelId);
    const costYuan =
      (params.inputTokens / 1_000_000) * pricing.input +
      (params.outputTokens / 1_000_000) * pricing.output +
      ((params.cacheHitTokens ?? 0) / 1_000_000) * pricing.cache;

    await db.aiUsageLog.create({
      data: {
        userId: params.userId,
        workspaceId: params.workspaceId,
        taskType: params.taskType,
        model: params.modelId,
        inputTokens: Math.max(0, Math.floor(params.inputTokens)),
        outputTokens: Math.max(0, Math.floor(params.outputTokens)),
        cacheHitTokens: Math.max(0, Math.floor(params.cacheHitTokens ?? 0)),
        costYuan,
        billedPoints: 0,
        pointRate: 0,
        billingMultiplier: 0,
        durationMs: Math.max(0, Math.floor(params.durationMs)),
      },
    });
    return {
      costYuan,
      billedPoints: 0,
    };
  }

  const settlement = await settleTokenReservation({
    reservationId: params.reservationId,
    userId: params.userId,
    workspaceId: params.workspaceId,
    taskType: params.taskType,
    modelId: params.modelId,
    usage: {
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cacheHitTokens: params.cacheHitTokens ?? 0,
    },
    durationMs: params.durationMs,
    description: `Settle usage for ${params.taskType}`,
  });

  return {
    costYuan: settlement.costYuan,
    billedPoints: settlement.billedPoints,
  };
}

export async function getUserTokenSummary(userId: string) {
  return getUserWalletSummary(userId);
}

export async function ensureUserTokenQuota(
  userId: string,
  reservePoints: number,
  taskLabel = "Current task"
) {
  const wallet = await ensureWalletCanReserve(userId, reservePoints, taskLabel);
  return {
    tokenBudget: wallet.totalPoints,
    tokenUsed: wallet.usedPoints,
    tokenRemaining: wallet.availablePoints,
    tokenFrozen: wallet.frozenPoints,
    dailyUsedPoints: wallet.dailyUsedPoints,
  };
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
