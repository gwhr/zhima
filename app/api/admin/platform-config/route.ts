import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import {
  TOKEN_PLAN_IDS,
  getPlatformConfig,
  savePlatformConfig,
  type TokenPlanId,
} from "@/lib/system-config";
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
    "freeWorkspaceLimit",
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
    "requireRechargeForDownload",
    "maintenanceNoticeEnabled",
    "supportContactEnabled",
    "homepageProcessEnabled",
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
  if ("supportContactTitle" in body) {
    patch.supportContactTitle = String(body.supportContactTitle || "").trim();
  }
  if ("supportContactDescription" in body) {
    patch.supportContactDescription = String(
      body.supportContactDescription || ""
    ).trim();
  }
  if ("supportContactQrUrl" in body) {
    patch.supportContactQrUrl = String(body.supportContactQrUrl || "").trim();
  }
  if ("homepageProcessTitle" in body) {
    patch.homepageProcessTitle = String(body.homepageProcessTitle || "").trim();
  }
  if ("homepageProcessDescription" in body) {
    patch.homepageProcessDescription = String(
      body.homepageProcessDescription || ""
    ).trim();
  }
  if ("homepageProcessSteps" in body) {
    if (!Array.isArray(body.homepageProcessSteps)) {
      return error("homepageProcessSteps 必须为数组", 400);
    }
    const normalized = body.homepageProcessSteps
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const raw = item as Record<string, unknown>;
        const title = String(raw.title || "").trim();
        const description = String(raw.description || "").trim();
        const imageUrl = String(raw.imageUrl || "").trim();
        if (!title || !description) return null;
        return { title, description, imageUrl };
      })
      .filter((item) => Boolean(item))
      .slice(0, 8);
    if (!normalized.length) {
      return error("homepageProcessSteps 至少需要一个有效步骤", 400);
    }
    patch.homepageProcessSteps = normalized;
  }
  if ("tokenRechargePlans" in body) {
    if (!Array.isArray(body.tokenRechargePlans)) {
      return error("tokenRechargePlans 必须为数组", 400);
    }

    const current = await getPlatformConfig();
    const currentMap = new Map(
      current.tokenRechargePlans.map((plan) => [plan.id, plan])
    );
    const nextMap = new Map<TokenPlanId, (typeof current.tokenRechargePlans)[number]>();

    for (const rawItem of body.tokenRechargePlans) {
      if (!rawItem || typeof rawItem !== "object") continue;
      const item = rawItem as Record<string, unknown>;
      const id = String(item.id || "").toUpperCase() as TokenPlanId;
      if (!TOKEN_PLAN_IDS.includes(id)) continue;

      const previous = currentMap.get(id);
      const name = String(item.name || "").trim();
      const priceYuan = Number(item.priceYuan);
      const points = Number(item.points);
      const description = String(item.description || "").trim();
      const published = Boolean(item.published);

      if (!name) {
        return error(`套餐 ${id} 名称不能为空`, 400);
      }
      if (!Number.isFinite(priceYuan) || priceYuan <= 0) {
        return error(`套餐 ${id} 价格必须大于 0`, 400);
      }
      if (!Number.isFinite(points) || points <= 0) {
        return error(`套餐 ${id} 点数必须大于 0`, 400);
      }

      nextMap.set(id, {
        id,
        name,
        priceYuan: Number(priceYuan.toFixed(2)),
        points: Math.floor(points),
        description: description || previous?.description || "",
        published,
      });
    }

    patch.tokenRechargePlans = TOKEN_PLAN_IDS.map((id) => {
      const nextItem = nextMap.get(id);
      if (nextItem) return nextItem;
      return currentMap.get(id)!;
    });
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
