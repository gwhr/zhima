import { db } from "@/lib/db";
import { models, type ModelId } from "./providers";
import type { AiTaskType } from "@prisma/client";

type QuotaStage = "normal" | "tightened" | "economy" | "exceeded";

const modelMatrix: Record<QuotaStage, Partial<Record<AiTaskType, ModelId>>> = {
  normal: {
    CODE_GEN: "opus",
    CHART: "opus",
    MODIFY_COMPLEX: "opus",
  },
  tightened: {
    CODE_GEN: "opus",
  },
  economy: {},
  exceeded: {},
};

const defaultModel: ModelId = "glm";

export function getQuotaStage(used: number, budget: number): QuotaStage {
  if (budget <= 0) return "normal";
  const ratio = used / budget;
  if (ratio >= 1) return "exceeded";
  if (ratio >= 0.9) return "economy";
  if (ratio >= 0.6) return "tightened";
  return "normal";
}

export async function selectModel(
  userId: string,
  workspaceId: string,
  taskType: AiTaskType
): Promise<{ model: (typeof models)[ModelId]; modelId: ModelId; stage: QuotaStage }> {
  const quota = await db.userQuota.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  const stage = quota
    ? getQuotaStage(Number(quota.opusUsed), Number(quota.opusBudget))
    : "normal";

  if (stage === "exceeded") {
    throw new Error("额度已用完，请升级套餐");
  }

  const stageMatrix = modelMatrix[stage];
  const modelId = stageMatrix[taskType] || defaultModel;

  return {
    model: models[modelId],
    modelId,
    stage,
  };
}
