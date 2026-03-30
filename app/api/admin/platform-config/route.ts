import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { getPlatformConfig, savePlatformConfig } from "@/lib/system-config";
import { listModelOptionIds } from "@/lib/model-catalog-config";
import { logAdminAudit } from "@/lib/admin-audit";

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const [config, modelIds] = await Promise.all([
    getPlatformConfig(),
    listModelOptionIds(),
  ]);
  return success({
    config,
    modelOptions: modelIds,
  });
}

export async function PATCH(req: Request) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body) return error("请求参数无效", 400);

  const modelIds = await listModelOptionIds();

  const patch: Record<string, unknown> = {};
  const positiveNumberKeys = [
    "defaultUserTokenBudget",
    "codeGenTokenReserve",
    "thesisGenTokenReserve",
    "chatTokenReserve",
    "tokenPointsPerYuan",
    "dailyUserPointLimit",
    "defaultUserTaskConcurrencyLimit",
    "singleTaskTokenHardLimit",
  ] as const;
  for (const key of positiveNumberKeys) {
    if (key in body) {
      const value = Number(body[key]);
      if (!Number.isFinite(value) || value <= 0) {
        return error(`${key} 必须为正数`, 400);
      }
      patch[key] = Math.floor(value);
    }
  }

  if ("taskFailureRetryLimit" in body) {
    const value = Number(body.taskFailureRetryLimit);
    if (!Number.isFinite(value) || value < 0) {
      return error("taskFailureRetryLimit 必须为非负数", 400);
    }
    patch.taskFailureRetryLimit = Math.floor(value);
  }

  if ("tokenBillingMultiplier" in body) {
    const value = Number(body.tokenBillingMultiplier);
    if (!Number.isFinite(value) || value <= 0) {
      return error("tokenBillingMultiplier 必须为正数", 400);
    }
    patch.tokenBillingMultiplier = Number(value.toFixed(4));
  }

  const booleanKeys = [
    "enableCodeGeneration",
    "enableThesisGeneration",
    "enablePreviewBuild",
    "maintenanceNoticeEnabled",
  ] as const;
  for (const key of booleanKeys) {
    if (key in body) {
      patch[key] = Boolean(body[key]);
    }
  }

  const modelKeys = ["codeGenModelId", "thesisGenModelId"] as const;
  for (const key of modelKeys) {
    if (key in body) {
      const value = String(body[key] || "");
      if (!modelIds.includes(value)) {
        return error(`${key} 不在可用模型列表中`, 400);
      }
      patch[key] = value;
    }
  }

  if ("maintenanceNoticeText" in body) {
    patch.maintenanceNoticeText = String(body.maintenanceNoticeText || "").trim();
  }

  const beforeConfig = await getPlatformConfig();
  const config = await savePlatformConfig(patch);

  await logAdminAudit({
    adminUserId: session!.user.id,
    action: "platform.config.update",
    module: "platform",
    targetType: "SystemConfig",
    targetId: "platform:settings",
    summary: "更新平台配置",
    before: beforeConfig,
    after: config,
    metadata: {
      changedKeys: Object.keys(patch),
    },
    req,
  });

  return success({ config });
}
