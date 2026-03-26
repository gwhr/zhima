import { db } from "@/lib/db";
import { getRuntimeModel, type RuntimeModel } from "./runtime-model";
import type { AiTaskType } from "@prisma/client";

type QuotaStage = "normal" | "tightened" | "economy" | "exceeded";

const modelMatrix: Record<QuotaStage, Partial<Record<AiTaskType, string>>> = {
  normal: {
    CODE_GEN: "deepseek",
    THESIS: "glm",
    CHART: "glm",
    MODIFY_COMPLEX: "deepseek",
  },
  tightened: {
    CODE_GEN: "glm",
    THESIS: "glm",
    CHART: "glm",
    MODIFY_COMPLEX: "glm",
  },
  economy: {
    CODE_GEN: "glm",
    THESIS: "glm",
    CHART: "glm",
    MODIFY_COMPLEX: "glm",
  },
  exceeded: {
    CODE_GEN: "glm",
    THESIS: "glm",
    CHART: "glm",
    MODIFY_COMPLEX: "glm",
  },
};

const defaultModel = "deepseek";

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
): Promise<{ model: RuntimeModel; modelId: string; stage: QuotaStage }> {
  const quota = await db.userQuota.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  const stage = quota
    ? getQuotaStage(Number(quota.opusUsed), Number(quota.opusBudget))
    : "normal";

  const stageMatrix = modelMatrix[stage];
  const modelId = stageMatrix[taskType] || defaultModel;
  const model = await getRuntimeModel(modelId);

  return {
    model,
    modelId,
    stage,
  };
}
