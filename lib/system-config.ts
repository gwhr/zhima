import { db } from "@/lib/db";
import type { ModelId } from "@/lib/ai/providers";
import type { Prisma } from "@prisma/client";

const PLATFORM_CONFIG_KEY = "platform:settings";

export interface PlatformConfig {
  codeGenModelId: string;
  thesisGenModelId: string;
  defaultUserTokenBudget: number;
  codeGenTokenReserve: number;
  thesisGenTokenReserve: number;
  defaultUserTaskConcurrencyLimit: number;
  taskFailureRetryLimit: number;
  singleTaskTokenHardLimit: number;
  enableCodeGeneration: boolean;
  enableThesisGeneration: boolean;
  enablePreviewBuild: boolean;
  maintenanceNoticeEnabled: boolean;
  maintenanceNoticeText: string;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export function getDefaultPlatformConfigFromEnv(): PlatformConfig {
  return {
    codeGenModelId: (process.env.CODE_GEN_MODEL_ID || "deepseek") as ModelId,
    thesisGenModelId: (process.env.THESIS_GEN_MODEL_ID || "glm") as ModelId,
    defaultUserTokenBudget: parsePositiveInt(
      process.env.DEFAULT_USER_TOKEN_BUDGET,
      500_000
    ),
    codeGenTokenReserve: parsePositiveInt(
      process.env.CODE_GEN_TOKEN_RESERVE,
      120_000
    ),
    thesisGenTokenReserve: parsePositiveInt(
      process.env.THESIS_GEN_TOKEN_RESERVE,
      220_000
    ),
    defaultUserTaskConcurrencyLimit: parsePositiveInt(
      process.env.DEFAULT_USER_TASK_CONCURRENCY_LIMIT,
      1
    ),
    taskFailureRetryLimit: parseNonNegativeInt(
      process.env.TASK_FAILURE_RETRY_LIMIT,
      2
    ),
    singleTaskTokenHardLimit: parsePositiveInt(
      process.env.SINGLE_TASK_TOKEN_HARD_LIMIT,
      240_000
    ),
    enableCodeGeneration: parseBoolean(process.env.ENABLE_CODE_GENERATION, true),
    enableThesisGeneration: parseBoolean(
      process.env.ENABLE_THESIS_GENERATION,
      true
    ),
    enablePreviewBuild: parseBoolean(process.env.ENABLE_PREVIEW_BUILD, true),
    maintenanceNoticeEnabled: parseBoolean(
      process.env.MAINTENANCE_NOTICE_ENABLED,
      false
    ),
    maintenanceNoticeText: process.env.MAINTENANCE_NOTICE_TEXT || "",
  };
}

function normalizeConfig(
  input: Partial<PlatformConfig> | null | undefined
): PlatformConfig {
  const defaults = getDefaultPlatformConfigFromEnv();
  if (!input) return defaults;

  return {
    ...defaults,
    ...input,
    defaultUserTokenBudget: Math.max(
      1,
      Number(input.defaultUserTokenBudget ?? defaults.defaultUserTokenBudget)
    ),
    codeGenTokenReserve: Math.max(
      1,
      Number(input.codeGenTokenReserve ?? defaults.codeGenTokenReserve)
    ),
    thesisGenTokenReserve: Math.max(
      1,
      Number(input.thesisGenTokenReserve ?? defaults.thesisGenTokenReserve)
    ),
    defaultUserTaskConcurrencyLimit: Math.max(
      1,
      Math.min(
        20,
        Number(
          input.defaultUserTaskConcurrencyLimit ??
            defaults.defaultUserTaskConcurrencyLimit
        )
      )
    ),
    taskFailureRetryLimit: Math.max(
      0,
      Math.min(
        5,
        Number(input.taskFailureRetryLimit ?? defaults.taskFailureRetryLimit)
      )
    ),
    singleTaskTokenHardLimit: Math.max(
      1_000,
      Number(input.singleTaskTokenHardLimit ?? defaults.singleTaskTokenHardLimit)
    ),
    maintenanceNoticeText:
      typeof input.maintenanceNoticeText === "string"
        ? input.maintenanceNoticeText
        : defaults.maintenanceNoticeText,
  };
}

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const row = await db.systemConfig.findUnique({
    where: { key: PLATFORM_CONFIG_KEY },
  });
  if (!row) {
    return getDefaultPlatformConfigFromEnv();
  }

  const value =
    row.value && typeof row.value === "object" && !Array.isArray(row.value)
      ? (row.value as Partial<PlatformConfig>)
      : null;

  return normalizeConfig(value);
}

export async function savePlatformConfig(
  partial: Partial<PlatformConfig>
): Promise<PlatformConfig> {
  const current = await getPlatformConfig();
  const next = normalizeConfig({
    ...current,
    ...partial,
  });

  await db.systemConfig.upsert({
    where: { key: PLATFORM_CONFIG_KEY },
    create: {
      key: PLATFORM_CONFIG_KEY,
      value: next as unknown as Prisma.InputJsonValue,
    },
    update: {
      value: next as unknown as Prisma.InputJsonValue,
    },
  });

  return next;
}
