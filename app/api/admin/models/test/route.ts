import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { getResolvedModelProviderConfig } from "@/lib/model-provider-config";
import { getRuntimeModelDefinition } from "@/lib/model-catalog-config";

type TestRequestBody = {
  kind?: "builtin" | "custom";
  modelId?: string;
  modelName?: string;
  baseUrl?: string;
  apiKey?: string;
  anthropicApiKey?: string;
  deepseekApiKey?: string;
  deepseekBaseUrl?: string;
  zhipuApiKey?: string;
  zhipuBaseUrl?: string;
};

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function runModelPing(model: Parameters<typeof generateText>[0]["model"]) {
  const startedAt = Date.now();
  const result = await generateText({
    model,
    prompt: "请只返回“OK”，不要输出其他内容。",
    maxOutputTokens: 16,
  });

  const usage = result.usage as {
    inputTokens?: number;
    outputTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  const inputTokens = usage?.inputTokens ?? usage?.promptTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? usage?.completionTokens ?? 0;

  return {
    latencyMs: Date.now() - startedAt,
    preview: result.text.trim().slice(0, 80),
    inputTokens,
    outputTokens,
  };
}

export async function POST(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as TestRequestBody | null;
  if (!body) return error("请求参数无效", 400);

  const kind = body.kind === "custom" ? "custom" : "builtin";

  try {
    if (kind === "builtin") {
      const modelId = (body.modelId || "").trim().toLowerCase();
      if (!["opus", "deepseek", "glm"].includes(modelId)) {
        return error("内置模型 ID 无效", 400);
      }

      const providerConfig = await getResolvedModelProviderConfig();

      if (modelId === "opus") {
        const apiKey =
          (body.anthropicApiKey || "").trim() || providerConfig.anthropicApiKey;
        if (!apiKey) {
          return error("请先填写 Anthropic Key", 400);
        }
        const model = createAnthropic({ apiKey })("claude-sonnet-4-20250514");
        const ping = await runModelPing(model);
        return success({
          ok: true,
          modelId,
          ...ping,
        });
      }

      if (modelId === "deepseek") {
        const apiKey =
          (body.deepseekApiKey || "").trim() || providerConfig.deepseekApiKey;
        const baseUrl =
          (body.deepseekBaseUrl || "").trim() || providerConfig.deepseekBaseUrl;
        if (!apiKey) {
          return error("请先填写 DeepSeek Key", 400);
        }
        if (!isValidHttpUrl(baseUrl)) {
          return error("DeepSeek Base URL 不合法", 400);
        }
        const model = createOpenAI({
          apiKey,
          baseURL: baseUrl,
        }).chat("deepseek-chat");
        const ping = await runModelPing(model);
        return success({
          ok: true,
          modelId,
          baseUrl,
          ...ping,
        });
      }

      const apiKey =
        (body.zhipuApiKey || "").trim() || providerConfig.zhipuApiKey;
      const baseUrl =
        (body.zhipuBaseUrl || "").trim() || providerConfig.zhipuBaseUrl;
      if (!apiKey) {
        return error("请先填写 GLM Key", 400);
      }
      if (!isValidHttpUrl(baseUrl)) {
        return error("GLM Base URL 不合法", 400);
      }
      const model = createOpenAI({
        apiKey,
        baseURL: baseUrl,
      }).chat("glm-4-flash");
      const ping = await runModelPing(model);
      return success({
        ok: true,
        modelId,
        baseUrl,
        ...ping,
      });
    }

    const inputModelId = (body.modelId || "").trim().toLowerCase();
    const runtimeModel = inputModelId
      ? await getRuntimeModelDefinition(inputModelId)
      : null;
    const fallbackRuntimeModel =
      runtimeModel && runtimeModel.source === "custom" ? runtimeModel : null;

    const modelName =
      (body.modelName || "").trim() || fallbackRuntimeModel?.modelName || "";
    const baseUrl =
      (body.baseUrl || "").trim() || fallbackRuntimeModel?.baseUrl || "";
    const apiKey = (body.apiKey || "").trim() || fallbackRuntimeModel?.apiKey || "";

    if (!modelName) {
      return error("请先填写底层 Model Name", 400);
    }
    if (!baseUrl || !isValidHttpUrl(baseUrl)) {
      return error("请先填写合法的 Base URL", 400);
    }
    if (!apiKey) {
      return error("请先填写 API Key（或先保存模型后再测试）", 400);
    }

    const model = createOpenAI({
      apiKey,
      baseURL: baseUrl,
    }).chat(modelName);
    const ping = await runModelPing(model);
    return success({
      ok: true,
      modelId: inputModelId || null,
      modelName,
      baseUrl,
      ...ping,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "连接测试失败，请稍后重试";
    return error(`连接测试失败：${message}`, 502);
  }
}

