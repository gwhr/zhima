import { db } from "@/lib/db";
import { modelCosts, type ModelId } from "./providers";
import type { AiTaskType } from "@prisma/client";

interface UsageParams {
  userId: string;
  workspaceId: string;
  taskType: AiTaskType;
  modelId: ModelId;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export async function recordUsage(params: UsageParams) {
  const costs = modelCosts[params.modelId];
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
