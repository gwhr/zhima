import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { models, type ModelId } from "@/lib/ai/providers";
import {
  getPlatformConfig,
  savePlatformConfig,
  type PlatformConfig,
} from "@/lib/system-config";
import {
  getModelProviderAdminView,
  saveModelProviderConfig,
  type ModelProviderPatch,
} from "@/lib/model-provider-config";
import { logAdminAudit } from "@/lib/admin-audit";

const modelOptions = Object.keys(models) as ModelId[];

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const [platformConfig, providerConfig] = await Promise.all([
    getPlatformConfig(),
    getModelProviderAdminView(),
  ]);

  return success({
    modelOptions,
    config: {
      codeGenModelId: platformConfig.codeGenModelId,
      thesisGenModelId: platformConfig.thesisGenModelId,
    },
    providers: providerConfig,
  });
}

export async function PATCH(req: Request) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body) return error("请求参数无效", 400);

  const platformPatch: Partial<
    Pick<PlatformConfig, "codeGenModelId" | "thesisGenModelId">
  > = {};

  if ("codeGenModelId" in body) {
    const value = String(body.codeGenModelId || "").trim();
    if (!modelOptions.includes(value as ModelId)) {
      return error("代码生成模型不在可选列表中", 400);
    }
    platformPatch.codeGenModelId = value;
  }

  if ("thesisGenModelId" in body) {
    const value = String(body.thesisGenModelId || "").trim();
    if (!modelOptions.includes(value as ModelId)) {
      return error("论文生成模型不在可选列表中", 400);
    }
    platformPatch.thesisGenModelId = value;
  }

  const providerPatch: ModelProviderPatch = {};
  const keyFields = ["anthropicApiKey", "deepseekApiKey", "zhipuApiKey"] as const;
  for (const field of keyFields) {
    if (field in body) {
      if (typeof body[field] !== "string") {
        return error(`${field} 必须是字符串`, 400);
      }
      providerPatch[field] = body[field];
    }
  }

  const urlFields = ["deepseekBaseUrl", "zhipuBaseUrl"] as const;
  for (const field of urlFields) {
    if (field in body) {
      if (typeof body[field] !== "string") {
        return error(`${field} 必须是字符串`, 400);
      }
      const value = body[field].trim();
      if (value && !isValidUrl(value)) {
        return error(`${field} 不是合法 URL`, 400);
      }
      providerPatch[field] = value;
    }
  }

  const before = await Promise.all([
    getPlatformConfig(),
    getModelProviderAdminView(),
  ]);
  const beforePlatform = before[0];
  const beforeProviders = before[1];

  let nextPlatform = beforePlatform;
  let nextProviders = beforeProviders;

  if (Object.keys(platformPatch).length > 0) {
    nextPlatform = await savePlatformConfig(platformPatch);
  }
  if (Object.keys(providerPatch).length > 0) {
    nextProviders = await saveModelProviderConfig(providerPatch);
  }

  if (
    Object.keys(platformPatch).length > 0 ||
    Object.keys(providerPatch).length > 0
  ) {
    await logAdminAudit({
      adminUserId: session!.user.id,
      action: "platform.models.update",
      module: "platform",
      targetType: "SystemConfig",
      targetId: "platform:model-provider-config",
      summary: "更新模型管理配置",
      before: {
        modelSelection: {
          codeGenModelId: beforePlatform.codeGenModelId,
          thesisGenModelId: beforePlatform.thesisGenModelId,
        },
        providers: beforeProviders,
      },
      after: {
        modelSelection: {
          codeGenModelId: nextPlatform.codeGenModelId,
          thesisGenModelId: nextPlatform.thesisGenModelId,
        },
        providers: nextProviders,
      },
      metadata: {
        changedKeys: [...Object.keys(platformPatch), ...Object.keys(providerPatch)],
      },
      req,
    });
  }

  return success({
    modelOptions,
    config: {
      codeGenModelId: nextPlatform.codeGenModelId,
      thesisGenModelId: nextPlatform.thesisGenModelId,
    },
    providers: nextProviders,
  });
}
