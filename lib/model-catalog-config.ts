import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  builtinModelDefinitions,
  builtinModelIds,
  getBuiltinModelDefinition,
} from "@/lib/ai/providers";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/secure-secret";
import { getResolvedModelProviderConfig } from "@/lib/model-provider-config";

const MODEL_CATALOG_CONFIG_KEY = "platform:model-catalog";
const CUSTOM_MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/;

type RuntimeProviderType = "anthropic" | "openai-compatible";

type StoredCustomOpenAIModel = {
  id: string;
  name: string;
  modelName: string;
  baseUrl: string;
  apiKeyEnc: string;
  inputCostPerMToken: number;
  outputCostPerMToken: number;
  cacheHitCostPerMToken: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type StoredModelCatalogConfig = {
  customOpenAIModels?: StoredCustomOpenAIModel[];
  updatedAt?: string;
};

export type RuntimeModelDefinition = {
  id: string;
  name: string;
  provider: RuntimeProviderType;
  source: "builtin" | "custom";
  modelName: string;
  baseUrl?: string;
  apiKey: string;
  inputCostPerMToken: number;
  outputCostPerMToken: number;
  cacheHitCostPerMToken: number;
};

export type ModelOption = {
  id: string;
  name: string;
  source: "builtin" | "custom";
};

export type CustomOpenAIModelPatch = {
  id: string;
  name: string;
  modelName: string;
  baseUrl: string;
  apiKey?: string;
  inputCostPerMToken?: number;
  outputCostPerMToken?: number;
  cacheHitCostPerMToken?: number;
  enabled?: boolean;
};

export type CustomOpenAIModelAdminView = {
  id: string;
  name: string;
  modelName: string;
  baseUrl: string;
  inputCostPerMToken: number;
  outputCostPerMToken: number;
  cacheHitCostPerMToken: number;
  enabled: boolean;
  apiKeyMasked: string;
  apiKeySource: "admin" | "none";
};

function parseModelCatalog(raw: unknown): StoredModelCatalogConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const value = raw as Record<string, unknown>;
  const rawModels = Array.isArray(value.customOpenAIModels)
    ? value.customOpenAIModels
    : [];

  const customOpenAIModels = rawModels
    .map((item) => normalizeStoredCustomModel(item))
    .filter((item): item is StoredCustomOpenAIModel => item !== null);

  return {
    customOpenAIModels,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
  };
}

function normalizeStoredCustomModel(raw: unknown): StoredCustomOpenAIModel | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const id = normalizeModelId(value.id);
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const modelName =
    typeof value.modelName === "string" ? value.modelName.trim() : "";
  const baseUrl = typeof value.baseUrl === "string" ? value.baseUrl.trim() : "";
  const apiKeyEnc =
    typeof value.apiKeyEnc === "string" ? value.apiKeyEnc.trim() : "";

  if (!id || !name || !modelName || !baseUrl || !apiKeyEnc) {
    return null;
  }
  if (!isValidHttpUrl(baseUrl)) {
    return null;
  }

  return {
    id,
    name,
    modelName,
    baseUrl,
    apiKeyEnc,
    inputCostPerMToken: normalizeNonNegativeNumber(value.inputCostPerMToken, 0),
    outputCostPerMToken: normalizeNonNegativeNumber(
      value.outputCostPerMToken,
      0
    ),
    cacheHitCostPerMToken: normalizeNonNegativeNumber(
      value.cacheHitCostPerMToken,
      0
    ),
    enabled: value.enabled !== false,
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

function normalizeModelId(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

function normalizeNonNegativeNumber(raw: unknown, fallback: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return Math.round(value * 1_000_000) / 1_000_000;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function ensureCustomModelId(id: string) {
  if (!CUSTOM_MODEL_ID_PATTERN.test(id)) {
    throw new Error(
      "自定义模型 ID 格式无效，请使用 2-64 位小写字母、数字、点(.)、连字符(-)或下划线(_)"
    );
  }
  if (builtinModelIds.includes(id as (typeof builtinModelIds)[number])) {
    throw new Error(`模型 ID “${id}” 与内置模型冲突，请更换`);
  }
}

async function getStoredCatalog(): Promise<StoredModelCatalogConfig> {
  const row = await db.systemConfig.findUnique({
    where: { key: MODEL_CATALOG_CONFIG_KEY },
  });
  return parseModelCatalog(row?.value);
}

export async function listAvailableModelOptions(): Promise<ModelOption[]> {
  const stored = await getStoredCatalog();
  const builtin = builtinModelDefinitions.map((item) => ({
    id: item.id,
    name: item.name,
    source: "builtin" as const,
  }));
  const custom = (stored.customOpenAIModels || [])
    .filter((item) => item.enabled)
    .map((item) => ({
      id: item.id,
      name: item.name,
      source: "custom" as const,
    }));
  return [...builtin, ...custom];
}

export async function listModelOptionIds(): Promise<string[]> {
  const options = await listAvailableModelOptions();
  return options.map((item) => item.id);
}

export async function getCustomOpenAIModelAdminView(): Promise<
  CustomOpenAIModelAdminView[]
> {
  const stored = await getStoredCatalog();
  return (stored.customOpenAIModels || []).map((item) => {
    const plain = decryptSecret(item.apiKeyEnc);
    return {
      id: item.id,
      name: item.name,
      modelName: item.modelName,
      baseUrl: item.baseUrl,
      inputCostPerMToken: item.inputCostPerMToken,
      outputCostPerMToken: item.outputCostPerMToken,
      cacheHitCostPerMToken: item.cacheHitCostPerMToken,
      enabled: item.enabled,
      apiKeyMasked: maskSecret(plain),
      apiKeySource: plain ? "admin" : "none",
    };
  });
}

export async function saveCustomOpenAIModels(
  patchModels: CustomOpenAIModelPatch[]
): Promise<CustomOpenAIModelAdminView[]> {
  const current = await getStoredCatalog();
  const currentById = new Map(
    (current.customOpenAIModels || []).map((item) => [item.id, item])
  );
  const nowIso = new Date().toISOString();
  const usedIds = new Set<string>();
  const nextModels: StoredCustomOpenAIModel[] = [];

  for (const rawItem of patchModels) {
    const id = normalizeModelId(rawItem.id);
    const name = (rawItem.name || "").trim();
    const modelName = (rawItem.modelName || "").trim();
    const baseUrl = (rawItem.baseUrl || "").trim();
    const inputCostPerMToken = normalizeNonNegativeNumber(
      rawItem.inputCostPerMToken,
      0
    );
    const outputCostPerMToken = normalizeNonNegativeNumber(
      rawItem.outputCostPerMToken,
      0
    );
    const cacheHitCostPerMToken = normalizeNonNegativeNumber(
      rawItem.cacheHitCostPerMToken,
      0
    );

    ensureCustomModelId(id);
    if (usedIds.has(id)) {
      throw new Error(`模型 ID “${id}” 重复，请修改后重试`);
    }
    usedIds.add(id);

    if (!name) {
      throw new Error(`模型 “${id}” 的显示名称不能为空`);
    }
    if (!modelName) {
      throw new Error(`模型 “${id}” 的底层 Model Name 不能为空`);
    }
    if (!baseUrl || !isValidHttpUrl(baseUrl)) {
      throw new Error(`模型 “${id}” 的 Base URL 不合法`);
    }

    const previous = currentById.get(id);
    const apiKeyRaw =
      typeof rawItem.apiKey === "string" ? rawItem.apiKey.trim() : "";
    const apiKeyEnc = apiKeyRaw
      ? encryptSecret(apiKeyRaw)
      : previous?.apiKeyEnc || "";

    if (!apiKeyEnc) {
      throw new Error(`模型 “${id}” 缺少 API Key`);
    }

    nextModels.push({
      id,
      name,
      modelName,
      baseUrl,
      apiKeyEnc,
      inputCostPerMToken,
      outputCostPerMToken,
      cacheHitCostPerMToken,
      enabled: rawItem.enabled !== false,
      createdAt: previous?.createdAt || nowIso,
      updatedAt: nowIso,
    });
  }

  const nextConfig: StoredModelCatalogConfig = {
    customOpenAIModels: nextModels,
    updatedAt: nowIso,
  };

  await db.systemConfig.upsert({
    where: { key: MODEL_CATALOG_CONFIG_KEY },
    create: {
      key: MODEL_CATALOG_CONFIG_KEY,
      value: nextConfig as unknown as Prisma.InputJsonValue,
    },
    update: {
      value: nextConfig as unknown as Prisma.InputJsonValue,
    },
  });

  return getCustomOpenAIModelAdminView();
}

export async function getRuntimeModelDefinition(
  modelId: string
): Promise<RuntimeModelDefinition | null> {
  const normalizedModelId = normalizeModelId(modelId);
  if (!normalizedModelId) return null;

  const builtin = getBuiltinModelDefinition(normalizedModelId);
  if (builtin) {
    const providerConfig = await getResolvedModelProviderConfig();
    if (builtin.id === "opus") {
      return {
        id: builtin.id,
        name: builtin.name,
        provider: "anthropic",
        source: "builtin",
        modelName: builtin.modelName,
        apiKey: providerConfig.anthropicApiKey,
        inputCostPerMToken: builtin.inputCostPerMToken,
        outputCostPerMToken: builtin.outputCostPerMToken,
        cacheHitCostPerMToken: builtin.cacheHitCostPerMToken,
      };
    }
    if (builtin.id === "deepseek") {
      return {
        id: builtin.id,
        name: builtin.name,
        provider: "openai-compatible",
        source: "builtin",
        modelName: builtin.modelName,
        baseUrl: providerConfig.deepseekBaseUrl,
        apiKey: providerConfig.deepseekApiKey,
        inputCostPerMToken: builtin.inputCostPerMToken,
        outputCostPerMToken: builtin.outputCostPerMToken,
        cacheHitCostPerMToken: builtin.cacheHitCostPerMToken,
      };
    }
    return {
      id: builtin.id,
      name: builtin.name,
      provider: "openai-compatible",
      source: "builtin",
      modelName: builtin.modelName,
      baseUrl: providerConfig.zhipuBaseUrl,
      apiKey: providerConfig.zhipuApiKey,
      inputCostPerMToken: builtin.inputCostPerMToken,
      outputCostPerMToken: builtin.outputCostPerMToken,
      cacheHitCostPerMToken: builtin.cacheHitCostPerMToken,
    };
  }

  const stored = await getStoredCatalog();
  const custom = (stored.customOpenAIModels || []).find(
    (item) => item.id === normalizedModelId && item.enabled
  );
  if (!custom) return null;

  return {
    id: custom.id,
    name: custom.name,
    provider: "openai-compatible",
    source: "custom",
    modelName: custom.modelName,
    baseUrl: custom.baseUrl,
    apiKey: decryptSecret(custom.apiKeyEnc),
    inputCostPerMToken: custom.inputCostPerMToken,
    outputCostPerMToken: custom.outputCostPerMToken,
    cacheHitCostPerMToken: custom.cacheHitCostPerMToken,
  };
}

export async function getModelPricing(modelId: string): Promise<{
  input: number;
  output: number;
  cache: number;
}> {
  const runtimeModel = await getRuntimeModelDefinition(modelId);
  if (!runtimeModel) {
    return { input: 0, output: 0, cache: 0 };
  }
  return {
    input: runtimeModel.inputCostPerMToken,
    output: runtimeModel.outputCostPerMToken,
    cache: runtimeModel.cacheHitCostPerMToken,
  };
}
