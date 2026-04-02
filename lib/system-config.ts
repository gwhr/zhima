import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const PLATFORM_CONFIG_KEY = "platform:settings";

export interface HomepageProcessStep {
  title: string;
  description: string;
  imageUrl: string;
}

export const TOKEN_PLAN_IDS = ["BASIC", "STANDARD", "PREMIUM"] as const;
export type TokenPlanId = (typeof TOKEN_PLAN_IDS)[number];

export interface TokenRechargePlanConfig {
  id: TokenPlanId;
  name: string;
  priceYuan: number;
  points: number;
  description: string;
  published: boolean;
}

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
  homepageProcessEnabled: boolean;
  homepageProcessTitle: string;
  homepageProcessDescription: string;
  homepageProcessSteps: HomepageProcessStep[];
  tokenRechargePlans: TokenRechargePlanConfig[];
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

function defaultTokenRechargePlans(): TokenRechargePlanConfig[] {
  return [
    {
      id: "BASIC",
      name: "点数包·基础",
      priceYuan: 9.9,
      points: 12_000,
      description: "适合轻量体验，含基础 AI 生成点数",
      published: true,
    },
    {
      id: "STANDARD",
      name: "点数包·标准",
      priceYuan: 29.9,
      points: 42_000,
      description: "主力推荐，满足日常项目多轮生成与修改",
      published: true,
    },
    {
      id: "PREMIUM",
      name: "点数包·高阶",
      priceYuan: 99.9,
      points: 160_000,
      description: "适合重度使用，覆盖代码/论文高频生成场景",
      published: true,
    },
  ];
}

function normalizeTokenRechargePlans(
  value: unknown,
  fallback: TokenRechargePlanConfig[]
): TokenRechargePlanConfig[] {
  if (!Array.isArray(value)) return fallback;

  const fallbackMap = new Map(fallback.map((item) => [item.id, item]));
  const parsedMap = new Map<TokenPlanId, TokenRechargePlanConfig>();

  for (const rawItem of value) {
    if (!rawItem || typeof rawItem !== "object") continue;
    const item = rawItem as Record<string, unknown>;
    const id = String(item.id ?? "").toUpperCase() as TokenPlanId;
    if (!TOKEN_PLAN_IDS.includes(id)) continue;

    const fallbackItem = fallbackMap.get(id);
    if (!fallbackItem) continue;

    const name = String(item.name ?? "").trim() || fallbackItem.name;
    const priceYuanRaw = Number(item.priceYuan);
    const pointsRaw = Number(item.points);
    const priceYuan =
      Number.isFinite(priceYuanRaw) && priceYuanRaw > 0
        ? Number(priceYuanRaw.toFixed(2))
        : fallbackItem.priceYuan;
    const points =
      Number.isFinite(pointsRaw) && pointsRaw > 0
        ? Math.floor(pointsRaw)
        : fallbackItem.points;
    const description =
      String(item.description ?? "").trim() || fallbackItem.description;
    const published =
      typeof item.published === "boolean"
        ? item.published
        : fallbackItem.published;

    parsedMap.set(id, {
      id,
      name,
      priceYuan,
      points,
      description,
      published,
    });
  }

  return TOKEN_PLAN_IDS.map((id) => parsedMap.get(id) || fallbackMap.get(id)!).filter(
    Boolean
  );
}

function defaultHomepageProcessSteps(): HomepageProcessStep[] {
  return [
    {
      title: "选择题目",
      description: "输入业务方向关键词，让系统推荐可落地的毕设题目。",
      imageUrl: "",
    },
    {
      title: "确认功能与技术栈",
      description: "按题目确认角色、功能模块、数据库与前后端技术栈。",
      imageUrl: "",
    },
    {
      title: "生成代码与论文",
      description: "分步生成项目代码、论文草稿和图表素材，支持继续追问优化。",
      imageUrl: "",
    },
    {
      title: "预览、导出与提交",
      description: "在线预览全量文件，导出压缩包后本地运行并按导师要求完善。",
      imageUrl: "",
    },
  ];
}

function normalizeHomepageProcessSteps(
  value: unknown,
  fallback: HomepageProcessStep[]
): HomepageProcessStep[] {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      const title = String(raw.title ?? "").trim();
      const description = String(raw.description ?? "").trim();
      const imageUrl = String(raw.imageUrl ?? "").trim();
      if (!title || !description) return null;
      return { title, description, imageUrl };
    })
    .filter((item): item is HomepageProcessStep => Boolean(item))
    .slice(0, 8);
  return normalized.length ? normalized : fallback;
}

export function getDefaultPlatformConfigFromEnv(): PlatformConfig {
  const defaultSteps = defaultHomepageProcessSteps();
  const defaultRechargePlans = defaultTokenRechargePlans();
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
      true
    ),
    supportContactTitle:
      process.env.SUPPORT_CONTACT_TITLE || "一对一辅导（人工）",
    supportContactDescription:
      process.env.SUPPORT_CONTACT_DESCRIPTION ||
      "可联系客服获取选题把关、部署排错、答辩材料梳理等一对一支持。",
    supportContactQrUrl:
      process.env.SUPPORT_CONTACT_QR_URL || "/support-qr-placeholder.svg",
    homepageProcessEnabled: parseBoolean(
      process.env.HOMEPAGE_PROCESS_ENABLED,
      true
    ),
    homepageProcessTitle: process.env.HOMEPAGE_PROCESS_TITLE || "操作流程",
    homepageProcessDescription:
      process.env.HOMEPAGE_PROCESS_DESCRIPTION ||
      "跟着步骤走，小白也能快速推进到可预览、可导出的阶段。",
    homepageProcessSteps: defaultSteps,
    tokenRechargePlans: defaultRechargePlans,
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
    homepageProcessTitle:
      typeof input.homepageProcessTitle === "string"
        ? input.homepageProcessTitle
        : defaults.homepageProcessTitle,
    homepageProcessDescription:
      typeof input.homepageProcessDescription === "string"
        ? input.homepageProcessDescription
        : defaults.homepageProcessDescription,
    homepageProcessEnabled:
      typeof input.homepageProcessEnabled === "boolean"
        ? input.homepageProcessEnabled
        : defaults.homepageProcessEnabled,
    homepageProcessSteps: normalizeHomepageProcessSteps(
      input.homepageProcessSteps,
      defaults.homepageProcessSteps
    ),
    tokenRechargePlans: normalizeTokenRechargePlans(
      input.tokenRechargePlans,
      defaults.tokenRechargePlans
    ),
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
