import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { builtinModelDefinitions, builtinModelIds } from "@/lib/ai/providers";
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
import {
  listAvailableModelOptions,
  getCustomOpenAIModelAdminView,
  saveCustomOpenAIModels,
  type CustomOpenAIModelPatch,
} from "@/lib/model-catalog-config";
import { logAdminAudit } from "@/lib/admin-audit";

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

  const [platformConfig, providerConfig, modelOptions, customOpenAIModels] =
    await Promise.all([
      getPlatformConfig(),
      getModelProviderAdminView(),
      listAvailableModelOptions(),
      getCustomOpenAIModelAdminView(),
    ]);

  return success({
    modelOptions: modelOptions.map((item) => item.id),
    modelOptionDetails: modelOptions,
    builtinPricing: builtinModelDefinitions.map((item) => ({
      id: item.id,
      name: item.name,
      inputCostPerMToken: item.inputCostPerMToken,
      outputCostPerMToken: item.outputCostPerMToken,
      cacheHitCostPerMToken: item.cacheHitCostPerMToken,
    })),
    config: {
      codeGenModelId: platformConfig.codeGenModelId,
      thesisGenModelId: platformConfig.thesisGenModelId,
    },
    providers: providerConfig,
    customOpenAIModels,
  });
}

export async function PATCH(req: Request) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body) return error("请求参数无效", 400);

  let customOpenAIModelsPatch: CustomOpenAIModelPatch[] | null = null;
  if ("customOpenAIModels" in body) {
    const raw = body.customOpenAIModels;
    if (!Array.isArray(raw)) {
      return error("customOpenAIModels 必须是数组", 400);
    }

    const normalized: CustomOpenAIModelPatch[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return error("customOpenAIModels 的每一项都必须是对象", 400);
      }
      const value = item as Record<string, unknown>;
      normalized.push({
        id: String(value.id || "").trim().toLowerCase(),
        name: String(value.name || "").trim(),
        modelName: String(value.modelName || "").trim(),
        baseUrl: String(value.baseUrl || "").trim(),
        apiKey: typeof value.apiKey === "string" ? value.apiKey : undefined,
        inputCostPerMToken:
          value.inputCostPerMToken === undefined
            ? undefined
            : Number(value.inputCostPerMToken),
        outputCostPerMToken:
          value.outputCostPerMToken === undefined
            ? undefined
            : Number(value.outputCostPerMToken),
        cacheHitCostPerMToken:
          value.cacheHitCostPerMToken === undefined
            ? undefined
            : Number(value.cacheHitCostPerMToken),
        enabled: value.enabled === undefined ? true : Boolean(value.enabled),
      });
    }
    customOpenAIModelsPatch = normalized;
  }

  const currentModelOptions = await listAvailableModelOptions();
  const availableModelIdsForValidation = customOpenAIModelsPatch
    ? [
        ...builtinModelIds,
        ...customOpenAIModelsPatch
          .filter((item) => item.enabled !== false)
          .map((item) => item.id),
      ]
    : currentModelOptions.map((item) => item.id);

  const platformPatch: Partial<
    Pick<PlatformConfig, "codeGenModelId" | "thesisGenModelId">
  > = {};

  if ("codeGenModelId" in body) {
    const value = String(body.codeGenModelId || "").trim().toLowerCase();
    if (!availableModelIdsForValidation.includes(value)) {
      return error("代码生成模型不在可选列表中", 400);
    }
    platformPatch.codeGenModelId = value;
  }

  if ("thesisGenModelId" in body) {
    const value = String(body.thesisGenModelId || "").trim().toLowerCase();
    if (!availableModelIdsForValidation.includes(value)) {
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

  const [beforePlatform, beforeProviders, beforeCustomOpenAIModels] =
    await Promise.all([
      getPlatformConfig(),
      getModelProviderAdminView(),
      getCustomOpenAIModelAdminView(),
    ]);

  try {
    let nextPlatform = beforePlatform;
    let nextProviders = beforeProviders;
    let nextCustomOpenAIModels = beforeCustomOpenAIModels;

    if (Object.keys(providerPatch).length > 0) {
      nextProviders = await saveModelProviderConfig(providerPatch);
    }
    if (customOpenAIModelsPatch) {
      nextCustomOpenAIModels = await saveCustomOpenAIModels(customOpenAIModelsPatch);
    }
    if (Object.keys(platformPatch).length > 0) {
      nextPlatform = await savePlatformConfig(platformPatch);
    }

    const nextModelOptions = await listAvailableModelOptions();

    if (
      Object.keys(platformPatch).length > 0 ||
      Object.keys(providerPatch).length > 0 ||
      customOpenAIModelsPatch !== null
    ) {
      await logAdminAudit({
        adminUserId: session!.user.id,
        action: "platform.models.update",
        module: "platform",
        targetType: "SystemConfig",
        targetId: "platform:model-management",
        summary: "更新模型管理配置",
        before: {
          modelSelection: {
            codeGenModelId: beforePlatform.codeGenModelId,
            thesisGenModelId: beforePlatform.thesisGenModelId,
          },
          providers: beforeProviders,
          customOpenAIModels: beforeCustomOpenAIModels,
        },
        after: {
          modelSelection: {
            codeGenModelId: nextPlatform.codeGenModelId,
            thesisGenModelId: nextPlatform.thesisGenModelId,
          },
          providers: nextProviders,
          customOpenAIModels: nextCustomOpenAIModels,
        },
        metadata: {
          changedKeys: [
            ...Object.keys(platformPatch),
            ...Object.keys(providerPatch),
            ...(customOpenAIModelsPatch ? ["customOpenAIModels"] : []),
          ],
        },
        req,
      });
    }

    return success({
      modelOptions: nextModelOptions.map((item) => item.id),
      modelOptionDetails: nextModelOptions,
      builtinPricing: builtinModelDefinitions.map((item) => ({
        id: item.id,
        name: item.name,
        inputCostPerMToken: item.inputCostPerMToken,
        outputCostPerMToken: item.outputCostPerMToken,
        cacheHitCostPerMToken: item.cacheHitCostPerMToken,
      })),
      config: {
        codeGenModelId: nextPlatform.codeGenModelId,
        thesisGenModelId: nextPlatform.thesisGenModelId,
      },
      providers: nextProviders,
      customOpenAIModels: nextCustomOpenAIModels,
    });
  } catch (caughtError) {
    if (caughtError instanceof Error && caughtError.message) {
      return error(caughtError.message, 400);
    }
    return error("保存模型配置失败", 500);
  }
}
