import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { getResolvedModelProviderConfig } from "@/lib/model-provider-config";
import { models, type ModelId } from "@/lib/ai/providers";

export type RuntimeModel = (typeof models)[ModelId];

export async function getRuntimeModel(modelId: ModelId): Promise<RuntimeModel> {
  const config = await getResolvedModelProviderConfig();

  switch (modelId) {
    case "opus":
      return createAnthropic({
        apiKey: config.anthropicApiKey,
      })("claude-sonnet-4-20250514");
    case "deepseek":
      return createOpenAI({
        apiKey: config.deepseekApiKey,
        baseURL: config.deepseekBaseUrl,
      }).chat("deepseek-chat");
    case "glm":
      return createOpenAI({
        apiKey: config.zhipuApiKey,
        baseURL: config.zhipuBaseUrl,
      }).chat("glm-4-flash");
    default:
      return createOpenAI({
        apiKey: config.deepseekApiKey,
        baseURL: config.deepseekBaseUrl,
      }).chat("deepseek-chat");
  }
}
