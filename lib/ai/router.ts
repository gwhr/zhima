import type { AiTaskType } from "@prisma/client";
import { getRuntimeModel, type RuntimeModel } from "./runtime-model";
import { getPlatformConfig } from "@/lib/system-config";

type ModelStage = "configured" | "fallback";
type QuotaStage = "normal" | "tightened" | "economy" | "exceeded";

const FALLBACK_MODEL_ID = "deepseek";

export function getQuotaStage(used: number, budget: number): QuotaStage {
  if (budget <= 0) return "normal";
  const ratio = used / budget;
  if (ratio >= 1) return "exceeded";
  if (ratio >= 0.9) return "economy";
  if (ratio >= 0.6) return "tightened";
  return "normal";
}

function pickModelIdByTask(
  taskType: AiTaskType,
  config: Awaited<ReturnType<typeof getPlatformConfig>>
) {
  if (taskType === "THESIS" || taskType === "CHART") {
    return config.thesisGenModelId;
  }
  return config.codeGenModelId;
}

export async function selectModel(
  _userId: string,
  _workspaceId: string,
  taskType: AiTaskType
): Promise<{ model: RuntimeModel; modelId: string; stage: ModelStage }> {
  const config = await getPlatformConfig().catch(() => null);
  const configuredModelId = config
    ? pickModelIdByTask(taskType, config)
    : FALLBACK_MODEL_ID;

  try {
    const model = await getRuntimeModel(configuredModelId);
    return {
      model,
      modelId: configuredModelId,
      stage: "configured",
    };
  } catch {
    const fallbackModel = await getRuntimeModel(FALLBACK_MODEL_ID);
    return {
      model: fallbackModel,
      modelId: FALLBACK_MODEL_ID,
      stage: "fallback",
    };
  }
}
