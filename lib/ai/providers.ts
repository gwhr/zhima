import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

export const zhipu = createOpenAI({
  apiKey: process.env.ZHIPU_API_KEY || "",
  baseURL: process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
});

export const models = {
  opus: anthropic("claude-sonnet-4-20250514"),
  deepseek: deepseek.chat("deepseek-chat"),
  glm: zhipu.chat("glm-4-flash"),
} as const;

export type ModelId = keyof typeof models;

export const modelCosts: Record<ModelId, { input: number; output: number }> = {
  opus: { input: 0.015, output: 0.075 },
  deepseek: { input: 0.001, output: 0.002 },
  glm: { input: 0, output: 0 },
};
