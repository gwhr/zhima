import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { getRuntimeModelDefinition } from "@/lib/model-catalog-config";

export type RuntimeModel = LanguageModel;

export async function getRuntimeModel(modelId: string): Promise<RuntimeModel> {
  let runtimeModel = await getRuntimeModelDefinition(modelId);
  if (!runtimeModel && modelId !== "deepseek") {
    runtimeModel = await getRuntimeModelDefinition("deepseek");
  }
  if (!runtimeModel) {
    throw new Error(`模型「${modelId}」未配置或已被禁用，且默认模型不可用`);
  }

  if (runtimeModel.provider === "anthropic") {
    return createAnthropic({
      apiKey: runtimeModel.apiKey,
    })(runtimeModel.modelName);
  }

  return createOpenAI({
    apiKey: runtimeModel.apiKey,
    baseURL: runtimeModel.baseUrl,
  }).chat(runtimeModel.modelName);
}
