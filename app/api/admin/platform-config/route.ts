import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { getPlatformConfig, savePlatformConfig } from "@/lib/system-config";
import { models } from "@/lib/ai/providers";

const modelIds = Object.keys(models);

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const config = await getPlatformConfig();
  return success({
    config,
    modelOptions: modelIds,
  });
}

export async function PATCH(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body) return error("请求参数无效", 400);

  const patch: Record<string, unknown> = {};
  const numberKeys = [
    "defaultUserTokenBudget",
    "codeGenTokenReserve",
    "thesisGenTokenReserve",
  ] as const;
  for (const key of numberKeys) {
    if (key in body) {
      const value = Number(body[key]);
      if (!Number.isFinite(value) || value <= 0) {
        return error(`${key} 必须为正数`, 400);
      }
      patch[key] = Math.floor(value);
    }
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

  const config = await savePlatformConfig(patch);
  return success({ config });
}
