import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/secure-secret";

const MODEL_PROVIDER_CONFIG_KEY = "platform:model-provider-config";

type KeySource = "admin" | "env" | "none";

type StoredModelProviderConfig = {
  anthropicApiKeyEnc?: string;
  deepseekApiKeyEnc?: string;
  zhipuApiKeyEnc?: string;
  deepseekBaseUrl?: string;
  zhipuBaseUrl?: string;
  updatedAt?: string;
};

export type ResolvedModelProviderConfig = {
  anthropicApiKey: string;
  deepseekApiKey: string;
  zhipuApiKey: string;
  deepseekBaseUrl: string;
  zhipuBaseUrl: string;
};

export type ModelProviderAdminView = {
  anthropicApiKeyMasked: string;
  deepseekApiKeyMasked: string;
  zhipuApiKeyMasked: string;
  anthropicApiKeySource: KeySource;
  deepseekApiKeySource: KeySource;
  zhipuApiKeySource: KeySource;
  deepseekBaseUrl: string;
  zhipuBaseUrl: string;
};

export type ModelProviderPatch = Partial<{
  anthropicApiKey: string;
  deepseekApiKey: string;
  zhipuApiKey: string;
  deepseekBaseUrl: string;
  zhipuBaseUrl: string;
}>;

function parseStoredConfig(raw: unknown): StoredModelProviderConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const value = raw as Record<string, unknown>;
  return {
    anthropicApiKeyEnc:
      typeof value.anthropicApiKeyEnc === "string"
        ? value.anthropicApiKeyEnc
        : undefined,
    deepseekApiKeyEnc:
      typeof value.deepseekApiKeyEnc === "string"
        ? value.deepseekApiKeyEnc
        : undefined,
    zhipuApiKeyEnc:
      typeof value.zhipuApiKeyEnc === "string" ? value.zhipuApiKeyEnc : undefined,
    deepseekBaseUrl:
      typeof value.deepseekBaseUrl === "string" ? value.deepseekBaseUrl : undefined,
    zhipuBaseUrl:
      typeof value.zhipuBaseUrl === "string" ? value.zhipuBaseUrl : undefined,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
  };
}

async function getStoredConfig(): Promise<StoredModelProviderConfig> {
  const row = await db.systemConfig.findUnique({
    where: { key: MODEL_PROVIDER_CONFIG_KEY },
  });
  return parseStoredConfig(row?.value);
}

function getEnvDefaults(): ResolvedModelProviderConfig {
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
    zhipuApiKey: process.env.ZHIPU_API_KEY || "",
    deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    zhipuBaseUrl:
      process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
  };
}

function resolveKey(
  encryptedOverride: string | undefined,
  envValue: string
): { value: string; source: KeySource } {
  const overrideValue = decryptSecret(encryptedOverride);
  if (overrideValue) {
    return { value: overrideValue, source: "admin" };
  }
  if (envValue.trim()) {
    return { value: envValue.trim(), source: "env" };
  }
  return { value: "", source: "none" };
}

export async function getResolvedModelProviderConfig(): Promise<ResolvedModelProviderConfig> {
  const [stored, envDefaults] = await Promise.all([
    getStoredConfig(),
    Promise.resolve(getEnvDefaults()),
  ]);

  const anthropic = resolveKey(stored.anthropicApiKeyEnc, envDefaults.anthropicApiKey);
  const deepseek = resolveKey(stored.deepseekApiKeyEnc, envDefaults.deepseekApiKey);
  const zhipu = resolveKey(stored.zhipuApiKeyEnc, envDefaults.zhipuApiKey);

  return {
    anthropicApiKey: anthropic.value,
    deepseekApiKey: deepseek.value,
    zhipuApiKey: zhipu.value,
    deepseekBaseUrl: (stored.deepseekBaseUrl || envDefaults.deepseekBaseUrl).trim(),
    zhipuBaseUrl: (stored.zhipuBaseUrl || envDefaults.zhipuBaseUrl).trim(),
  };
}

export async function getModelProviderAdminView(): Promise<ModelProviderAdminView> {
  const [stored, envDefaults] = await Promise.all([
    getStoredConfig(),
    Promise.resolve(getEnvDefaults()),
  ]);

  const anthropic = resolveKey(stored.anthropicApiKeyEnc, envDefaults.anthropicApiKey);
  const deepseek = resolveKey(stored.deepseekApiKeyEnc, envDefaults.deepseekApiKey);
  const zhipu = resolveKey(stored.zhipuApiKeyEnc, envDefaults.zhipuApiKey);

  return {
    anthropicApiKeyMasked: maskSecret(anthropic.value),
    deepseekApiKeyMasked: maskSecret(deepseek.value),
    zhipuApiKeyMasked: maskSecret(zhipu.value),
    anthropicApiKeySource: anthropic.source,
    deepseekApiKeySource: deepseek.source,
    zhipuApiKeySource: zhipu.source,
    deepseekBaseUrl: (stored.deepseekBaseUrl || envDefaults.deepseekBaseUrl).trim(),
    zhipuBaseUrl: (stored.zhipuBaseUrl || envDefaults.zhipuBaseUrl).trim(),
  };
}

function applyKeyPatch(
  target: StoredModelProviderConfig,
  encryptedField: keyof StoredModelProviderConfig,
  rawValue: unknown
) {
  if (typeof rawValue !== "string") return;
  const value = rawValue.trim();
  if (!value) {
    delete target[encryptedField];
    return;
  }
  target[encryptedField] = encryptSecret(value);
}

function applyUrlPatch(
  target: StoredModelProviderConfig,
  field: "deepseekBaseUrl" | "zhipuBaseUrl",
  rawValue: unknown
) {
  if (typeof rawValue !== "string") return;
  const value = rawValue.trim();
  if (!value) {
    delete target[field];
    return;
  }
  target[field] = value;
}

export async function saveModelProviderConfig(
  patch: ModelProviderPatch
): Promise<ModelProviderAdminView> {
  const current = await getStoredConfig();
  const next: StoredModelProviderConfig = { ...current };

  if ("anthropicApiKey" in patch) {
    applyKeyPatch(next, "anthropicApiKeyEnc", patch.anthropicApiKey);
  }
  if ("deepseekApiKey" in patch) {
    applyKeyPatch(next, "deepseekApiKeyEnc", patch.deepseekApiKey);
  }
  if ("zhipuApiKey" in patch) {
    applyKeyPatch(next, "zhipuApiKeyEnc", patch.zhipuApiKey);
  }
  if ("deepseekBaseUrl" in patch) {
    applyUrlPatch(next, "deepseekBaseUrl", patch.deepseekBaseUrl);
  }
  if ("zhipuBaseUrl" in patch) {
    applyUrlPatch(next, "zhipuBaseUrl", patch.zhipuBaseUrl);
  }

  next.updatedAt = new Date().toISOString();

  await db.systemConfig.upsert({
    where: { key: MODEL_PROVIDER_CONFIG_KEY },
    create: {
      key: MODEL_PROVIDER_CONFIG_KEY,
      value: next as unknown as Prisma.InputJsonValue,
    },
    update: {
      value: next as unknown as Prisma.InputJsonValue,
    },
  });

  return getModelProviderAdminView();
}
