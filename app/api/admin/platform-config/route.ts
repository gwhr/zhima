import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { getPlatformConfig, savePlatformConfig, normalizeTokenPlanId } from "@/lib/system-config";
import { listModelOptionIds } from "@/lib/model-catalog-config";
import { logAdminAudit } from "@/lib/admin-audit";

type HomepageStepPatch = {
  title: string;
  description: string;
  imageUrl: string;
};

type TokenPlanPatch = {
  id: string;
  name: string;
  priceYuan: number;
  points: number;
  description: string;
  published: boolean;
};

function parsePositiveInteger(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { ok: false as const, message: `${fieldName} must be a positive integer` };
  }
  return { ok: true as const, value: Math.floor(parsed) };
}

function parseNonNegativeInteger(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { ok: false as const, message: `${fieldName} must be a non-negative integer` };
  }
  return { ok: true as const, value: Math.floor(parsed) };
}

function parsePositiveNumber(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { ok: false as const, message: `${fieldName} must be greater than 0` };
  }
  return { ok: true as const, value: parsed };
}

function parseHomepageSteps(value: unknown) {
  if (!Array.isArray(value)) {
    return { ok: false as const, message: "homepageProcessSteps must be an array" };
  }

  const normalized: HomepageStepPatch[] = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const raw = item as Record<string, unknown>;
      const title = String(raw.title ?? "").trim();
      const description = String(raw.description ?? "").trim();
      const imageUrl = String(raw.imageUrl ?? "").trim();
      if (!title || !description) return null;
      return { title, description, imageUrl };
    })
    .filter((item): item is HomepageStepPatch => Boolean(item))
    .slice(0, 8);

  if (!normalized.length) {
    return {
      ok: false as const,
      message: "homepageProcessSteps requires at least one valid step",
    };
  }

  return { ok: true as const, value: normalized };
}

function parseTokenPlans(value: unknown) {
  if (!Array.isArray(value)) {
    return { ok: false as const, message: "tokenRechargePlans must be an array" };
  }

  const usedIds = new Set<string>();
  const normalized: TokenPlanPatch[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false as const, message: "tokenRechargePlans contains invalid item" };
    }
    const raw = item as Record<string, unknown>;

    const id = normalizeTokenPlanId(raw.id);
    if (!id) {
      return {
        ok: false as const,
        message:
          "Plan id is invalid. Use 2-64 chars with lowercase letters, numbers, underscore or hyphen.",
      };
    }
    if (usedIds.has(id)) {
      return { ok: false as const, message: `Duplicate plan id: ${id}` };
    }
    usedIds.add(id);

    const name = String(raw.name ?? "").trim();
    const description = String(raw.description ?? "").trim();
    const published = typeof raw.published === "boolean" ? raw.published : Boolean(raw.published);
    if (!name) {
      return { ok: false as const, message: `Plan ${id} name is required` };
    }

    const parsedPrice = parsePositiveNumber(raw.priceYuan, `Plan ${id} price`);
    if (!parsedPrice.ok) return parsedPrice;
    const parsedPoints = parsePositiveInteger(raw.points, `Plan ${id} points`);
    if (!parsedPoints.ok) return parsedPoints;

    normalized.push({
      id,
      name,
      description,
      published,
      priceYuan: Number(parsedPrice.value.toFixed(2)),
      points: parsedPoints.value,
    });
  }

  if (!normalized.length) {
    return { ok: false as const, message: "At least one token plan is required" };
  }
  return { ok: true as const, value: normalized };
}

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const [config, modelIds] = await Promise.all([getPlatformConfig(), listModelOptionIds()]);
  return success({ config, modelOptions: modelIds });
}

export async function PATCH(req: Request) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return error("Invalid request body", 400);

  const patch: Record<string, unknown> = {};
  const modelIds = await listModelOptionIds();

  const positiveIntegerFields = [
    "defaultUserTokenBudget",
    "codeGenTokenReserve",
    "thesisGenTokenReserve",
    "chatTokenReserve",
    "tokenPointsPerYuan",
    "dailyUserPointLimit",
    "defaultUserTaskConcurrencyLimit",
    "singleTaskTokenHardLimit",
  ] as const;

  for (const key of positiveIntegerFields) {
    if (!(key in body)) continue;
    const parsed = parsePositiveInteger(body[key], key);
    if (!parsed.ok) return error(parsed.message, 400);
    patch[key] = parsed.value;
  }

  if ("freeWorkspaceLimit" in body) {
    const parsed = parseNonNegativeInteger(body.freeWorkspaceLimit, "freeWorkspaceLimit");
    if (!parsed.ok) return error(parsed.message, 400);
    patch.freeWorkspaceLimit = parsed.value;
  }

  if ("taskFailureRetryLimit" in body) {
    const parsed = parseNonNegativeInteger(body.taskFailureRetryLimit, "taskFailureRetryLimit");
    if (!parsed.ok) return error(parsed.message, 400);
    patch.taskFailureRetryLimit = parsed.value;
  }

  if ("tokenBillingMultiplier" in body) {
    const parsed = parsePositiveNumber(body.tokenBillingMultiplier, "tokenBillingMultiplier");
    if (!parsed.ok) return error(parsed.message, 400);
    patch.tokenBillingMultiplier = Number(parsed.value.toFixed(4));
  }

  const booleanFields = [
    "enableCodeGeneration",
    "enableThesisGeneration",
    "enablePreviewBuild",
    "requireRechargeForDownload",
    "maintenanceNoticeEnabled",
    "supportContactEnabled",
    "homepageProcessEnabled",
  ] as const;

  for (const key of booleanFields) {
    if (!(key in body)) continue;
    patch[key] = Boolean(body[key]);
  }

  const modelFields = ["codeGenModelId", "thesisGenModelId"] as const;
  for (const key of modelFields) {
    if (!(key in body)) continue;
    const value = String(body[key] ?? "").trim();
    if (!modelIds.includes(value)) {
      return error(`${key} is not in available model options`, 400);
    }
    patch[key] = value;
  }

  const textFields = [
    "maintenanceNoticeText",
    "supportContactTitle",
    "supportContactDescription",
    "supportContactQrUrl",
    "homepageProcessTitle",
    "homepageProcessDescription",
  ] as const;

  for (const key of textFields) {
    if (!(key in body)) continue;
    patch[key] = String(body[key] ?? "").trim();
  }

  if ("homepageProcessSteps" in body) {
    const parsed = parseHomepageSteps(body.homepageProcessSteps);
    if (!parsed.ok) return error(parsed.message, 400);
    patch.homepageProcessSteps = parsed.value;
  }

  if ("tokenRechargePlans" in body) {
    const parsed = parseTokenPlans(body.tokenRechargePlans);
    if (!parsed.ok) return error(parsed.message, 400);
    patch.tokenRechargePlans = parsed.value;
  }

  const before = await getPlatformConfig();
  const next = await savePlatformConfig(patch);

  await logAdminAudit({
    adminUserId: session!.user.id,
    action: "platform.config.update",
    module: "platform",
    targetType: "SystemConfig",
    targetId: "platform:settings",
    summary: "Update platform configuration",
    before,
    after: next,
    metadata: { changedKeys: Object.keys(patch) },
    req,
  });

  return success({ config: next });
}
