import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const PLATFORM_CONFIG_KEY = "platform:settings";

export interface PlatformConfig {
  codeGenModelId: string;
  thesisGenModelId: string;
  defaultUserTokenBudget: number;
  freeWorkspaceLimit: number;
  codeGenTokenReserve: number;
  thesisGenTokenReserve: number;
  chatTokenReserve: number;
  tokenBillingMultiplier: number;
  tokenPointsPerYuan: number;
  dailyUserPointLimit: number;
  defaultUserTaskConcurrencyLimit: number;
  taskFailureRetryLimit: number;
  singleTaskTokenHardLimit: number;
  enableCodeGeneration: boolean;
  enableThesisGeneration: boolean;
  enablePreviewBuild: boolean;
  requireRechargeForDownload: boolean;
  maintenanceNoticeEnabled: boolean;
  maintenanceNoticeText: string;
  supportContactEnabled: boolean;
  supportContactTitle: string;
  supportContactDescription: string;
  supportContactQrUrl: string;
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

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getDefaultPlatformConfigFromEnv(): PlatformConfig {
  return {
    codeGenModelId: process.env.CODE_GEN_MODEL_ID || "deepseek",
    thesisGenModelId: process.env.THESIS_GEN_MODEL_ID || "glm",
    defaultUserTokenBudget: parsePositiveInt(
      process.env.DEFAULT_USER_TOKEN_BUDGET,
      500_000
    ),
    freeWorkspaceLimit: parseNonNegativeInt(
      process.env.FREE_USER_WORKSPACE_LIMIT,
      3
    ),
    codeGenTokenReserve: parsePositiveInt(
      process.env.CODE_GEN_TOKEN_RESERVE,
      120_000
    ),
    thesisGenTokenReserve: parsePositiveInt(
      process.env.THESIS_GEN_TOKEN_RESERVE,
      220_000
    ),
    chatTokenReserve: parsePositiveInt(process.env.CHAT_TOKEN_RESERVE, 8_000),
    tokenBillingMultiplier: parsePositiveNumber(
      process.env.TOKEN_BILLING_MULTIPLIER,
      3
    ),
    tokenPointsPerYuan: parsePositiveInt(
      process.env.TOKEN_POINTS_PER_YUAN,
      1000
    ),
    dailyUserPointLimit: parsePositiveInt(
      process.env.DAILY_USER_POINT_LIMIT,
      500_000
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
    requireRechargeForDownload: parseBoolean(
      process.env.REQUIRE_RECHARGE_FOR_DOWNLOAD,
      true
    ),
    maintenanceNoticeEnabled: parseBoolean(
      process.env.MAINTENANCE_NOTICE_ENABLED,
      false
    ),
    maintenanceNoticeText: process.env.MAINTENANCE_NOTICE_TEXT || "",
    supportContactEnabled: parseBoolean(
      process.env.SUPPORT_CONTACT_ENABLED,
      false
    ),
    supportContactTitle:
      process.env.SUPPORT_CONTACT_TITLE || "一对一辅导（人工）",
    supportContactDescription:
      process.env.SUPPORT_CONTACT_DESCRIPTION ||
      "可联系客服获取选题把关、部署排错、答辩材料梳理等一对一支持。",
    supportContactQrUrl: process.env.SUPPORT_CONTACT_QR_URL || "",
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
    freeWorkspaceLimit: Math.max(
      0,
      Number(input.freeWorkspaceLimit ?? defaults.freeWorkspaceLimit)
    ),
    codeGenTokenReserve: Math.max(
      1,
      Number(input.codeGenTokenReserve ?? defaults.codeGenTokenReserve)
    ),
    thesisGenTokenReserve: Math.max(
      1,
      Number(input.thesisGenTokenReserve ?? defaults.thesisGenTokenReserve)
    ),
    chatTokenReserve: Math.max(
      1,
      Number(input.chatTokenReserve ?? defaults.chatTokenReserve)
    ),
    tokenBillingMultiplier: Math.max(
      0.1,
      Math.min(
        10,
        Number(input.tokenBillingMultiplier ?? defaults.tokenBillingMultiplier)
      )
    ),
    tokenPointsPerYuan: Math.max(
      1,
      Number(input.tokenPointsPerYuan ?? defaults.tokenPointsPerYuan)
    ),
    dailyUserPointLimit: Math.max(
      1,
      Number(input.dailyUserPointLimit ?? defaults.dailyUserPointLimit)
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
    supportContactTitle:
      typeof input.supportContactTitle === "string"
        ? input.supportContactTitle
        : defaults.supportContactTitle,
    supportContactDescription:
      typeof input.supportContactDescription === "string"
        ? input.supportContactDescription
        : defaults.supportContactDescription,
    supportContactQrUrl:
      typeof input.supportContactQrUrl === "string"
        ? input.supportContactQrUrl
        : defaults.supportContactQrUrl,
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
