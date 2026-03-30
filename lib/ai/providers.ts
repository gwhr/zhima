export type ModelId = string;

export type BuiltinModelId = "opus" | "deepseek" | "glm";

export interface BuiltinModelDefinition {
  id: BuiltinModelId;
  name: string;
  provider: "anthropic" | "openai-compatible";
  modelName: string;
  defaultBaseUrl?: string;
  inputCostPerMToken: number;
  outputCostPerMToken: number;
  cacheHitCostPerMToken: number;
}

export const builtinModelDefinitions: BuiltinModelDefinition[] = [
  {
    id: "opus",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    modelName: "claude-sonnet-4-20250514",
    inputCostPerMToken: 0.015,
    outputCostPerMToken: 0.075,
    cacheHitCostPerMToken: 0,
  },
  {
    id: "deepseek",
    name: "DeepSeek Chat",
    provider: "openai-compatible",
    modelName: "deepseek-chat",
    defaultBaseUrl: "https://api.deepseek.com",
    inputCostPerMToken: 0.001,
    outputCostPerMToken: 0.002,
    cacheHitCostPerMToken: 0,
  },
  {
    id: "glm",
    name: "智谱 GLM-4-Flash",
    provider: "openai-compatible",
    modelName: "glm-4-flash",
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    inputCostPerMToken: 7,
    outputCostPerMToken: 21,
    cacheHitCostPerMToken: 1.4,
  },
];

const builtinModelMap = new Map(
  builtinModelDefinitions.map((item) => [item.id, item])
);

export const builtinModelIds = builtinModelDefinitions.map((item) => item.id);

export function getBuiltinModelDefinition(
  modelId: string
): BuiltinModelDefinition | null {
  return builtinModelMap.get(modelId as BuiltinModelId) ?? null;
}

export function getBuiltinModelPricing(modelId: string): {
  input: number;
  output: number;
  cache: number;
} | null {
  const model = getBuiltinModelDefinition(modelId);
  if (!model) return null;
  return {
    input: model.inputCostPerMToken,
    output: model.outputCostPerMToken,
    cache: model.cacheHitCostPerMToken,
  };
}
