"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type KeySource = "admin" | "env" | "none";

type ModelProviderView = {
  anthropicApiKeyMasked: string;
  deepseekApiKeyMasked: string;
  zhipuApiKeyMasked: string;
  anthropicApiKeySource: KeySource;
  deepseekApiKeySource: KeySource;
  zhipuApiKeySource: KeySource;
  deepseekBaseUrl: string;
  zhipuBaseUrl: string;
};

type ModelOptionDetail = {
  id: string;
  name: string;
  source: "builtin" | "custom";
};

type CustomOpenAIModelView = {
  id: string;
  name: string;
  modelName: string;
  baseUrl: string;
  inputCostPerMToken: number;
  outputCostPerMToken: number;
  enabled: boolean;
  apiKeyMasked: string;
  apiKeySource: "admin" | "none";
};

type CustomOpenAIModelForm = {
  localId: string;
  id: string;
  name: string;
  modelName: string;
  baseUrl: string;
  inputCostPerMToken: number;
  outputCostPerMToken: number;
  enabled: boolean;
  apiKey: string;
  apiKeyMasked: string;
  apiKeySource: "admin" | "none";
};

type ModelsResponse = {
  modelOptions: string[];
  modelOptionDetails?: ModelOptionDetail[];
  config: {
    codeGenModelId: string;
    thesisGenModelId: string;
  };
  providers: ModelProviderView;
  customOpenAIModels?: CustomOpenAIModelView[];
};

function sourceText(source: KeySource) {
  if (source === "admin") return "后台覆盖";
  if (source === "env") return "环境变量";
  return "未配置";
}

function customKeySourceText(source: "admin" | "none") {
  return source === "admin" ? "后台已保存" : "未配置";
}

function toCustomFormModel(item?: Partial<CustomOpenAIModelView>): CustomOpenAIModelForm {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: item?.id || "",
    name: item?.name || "",
    modelName: item?.modelName || "",
    baseUrl: item?.baseUrl || "https://api.openai.com/v1",
    inputCostPerMToken:
      typeof item?.inputCostPerMToken === "number" ? item.inputCostPerMToken : 0,
    outputCostPerMToken:
      typeof item?.outputCostPerMToken === "number" ? item.outputCostPerMToken : 0,
    enabled: item?.enabled !== false,
    apiKey: "",
    apiKeyMasked: item?.apiKeyMasked || "未配置",
    apiKeySource: item?.apiKeySource || "none",
  };
}

export default function AdminModelsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [modelOptions, setModelOptions] = useState<ModelOptionDetail[]>([]);
  const [codeGenModelId, setCodeGenModelId] = useState("");
  const [thesisGenModelId, setThesisGenModelId] = useState("");
  const [providers, setProviders] = useState<ModelProviderView | null>(null);
  const [customOpenAIModels, setCustomOpenAIModels] = useState<
    CustomOpenAIModelForm[]
  >([]);

  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [zhipuApiKey, setZhipuApiKey] = useState("");
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState("");
  const [zhipuBaseUrl, setZhipuBaseUrl] = useState("");

  const payloadPreview = useMemo(() => {
    const payload: Record<string, unknown> = {
      codeGenModelId,
      thesisGenModelId,
      deepseekBaseUrl: deepseekBaseUrl.trim(),
      zhipuBaseUrl: zhipuBaseUrl.trim(),
      customOpenAIModels: customOpenAIModels.map((item) => ({
        id: item.id.trim().toLowerCase(),
        name: item.name.trim(),
        modelName: item.modelName.trim(),
        baseUrl: item.baseUrl.trim(),
        inputCostPerMToken: Number(item.inputCostPerMToken) || 0,
        outputCostPerMToken: Number(item.outputCostPerMToken) || 0,
        enabled: item.enabled,
        apiKey: item.apiKey.trim(),
      })),
    };
    if (anthropicApiKey.trim()) payload.anthropicApiKey = anthropicApiKey.trim();
    if (deepseekApiKey.trim()) payload.deepseekApiKey = deepseekApiKey.trim();
    if (zhipuApiKey.trim()) payload.zhipuApiKey = zhipuApiKey.trim();
    return payload;
  }, [
    anthropicApiKey,
    codeGenModelId,
    deepseekApiKey,
    deepseekBaseUrl,
    thesisGenModelId,
    customOpenAIModels,
    zhipuApiKey,
    zhipuBaseUrl,
  ]);

  async function loadData() {
    setLoading(true);
    const response = await fetch("/api/admin/models");
    const result = await response.json();
    if (result.success) {
      const data = result.data as ModelsResponse;
      const options =
        data.modelOptionDetails && data.modelOptionDetails.length > 0
          ? data.modelOptionDetails
          : (data.modelOptions || []).map((id) => ({
              id,
              name: id,
              source: "builtin" as const,
            }));
      setModelOptions(options);
      setCodeGenModelId(data.config.codeGenModelId);
      setThesisGenModelId(data.config.thesisGenModelId);
      setProviders(data.providers);
      setDeepseekBaseUrl(data.providers.deepseekBaseUrl);
      setZhipuBaseUrl(data.providers.zhipuBaseUrl);
      setCustomOpenAIModels(
        (data.customOpenAIModels || []).map((item) => toCustomFormModel(item))
      );
    } else {
      setMessage(result.error || "加载模型管理配置失败");
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadPreview),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "保存失败");
      }

      const data = result.data as ModelsResponse;
      const options =
        data.modelOptionDetails && data.modelOptionDetails.length > 0
          ? data.modelOptionDetails
          : (data.modelOptions || []).map((id) => ({
              id,
              name: id,
              source: "builtin" as const,
            }));
      setModelOptions(options);
      setCodeGenModelId(data.config.codeGenModelId);
      setThesisGenModelId(data.config.thesisGenModelId);
      setProviders(data.providers);
      setDeepseekBaseUrl(data.providers.deepseekBaseUrl);
      setZhipuBaseUrl(data.providers.zhipuBaseUrl);
      setCustomOpenAIModels(
        (data.customOpenAIModels || []).map((item) => toCustomFormModel(item))
      );

      setAnthropicApiKey("");
      setDeepseekApiKey("");
      setZhipuApiKey("");
      setMessage("模型管理配置已保存");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function addCustomOpenAIModel() {
    setCustomOpenAIModels((prev) => [...prev, toCustomFormModel()]);
  }

  function removeCustomOpenAIModel(localId: string) {
    setCustomOpenAIModels((prev) => {
      const target = prev.find((item) => item.localId === localId);
      if (target) {
        if (target.id === codeGenModelId) setCodeGenModelId("deepseek");
        if (target.id === thesisGenModelId) setThesisGenModelId("glm");
      }
      return prev.filter((item) => item.localId !== localId);
    });
  }

  function updateCustomOpenAIModel(
    localId: string,
    patch: Partial<CustomOpenAIModelForm>
  ) {
    setCustomOpenAIModels((prev) =>
      prev.map((item) =>
        item.localId === localId
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  }

  const optionLabel = useMemo(
    () =>
      new Map(
        modelOptions.map((item) => [
          item.id,
          item.source === "custom" ? `${item.name}（${item.id}）` : item.name,
        ])
      ),
    [modelOptions]
  );

  if (loading || !providers) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载模型管理配置...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">模型管理</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">模型选择</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">代码生成模型</span>
            <select
              value={codeGenModelId}
              onChange={(event) => setCodeGenModelId(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3"
            >
              {modelOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {optionLabel.get(item.id)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">论文生成模型</span>
            <select
              value={thesisGenModelId}
              onChange={(event) => setThesisGenModelId(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3"
            >
              {modelOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {optionLabel.get(item.id)}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">模型 Key 配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Anthropic（opus）</div>
            <div className="text-xs text-muted-foreground">
              当前：{providers.anthropicApiKeyMasked}（来源：{sourceText(providers.anthropicApiKeySource)}）
            </div>
            <Input
              type="password"
              value={anthropicApiKey}
              onChange={(event) => setAnthropicApiKey(event.target.value)}
              placeholder="输入新 Key（留空则不修改）"
            />
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">DeepSeek</div>
            <div className="text-xs text-muted-foreground">
              当前：{providers.deepseekApiKeyMasked}（来源：{sourceText(providers.deepseekApiKeySource)}）
            </div>
            <Input
              type="password"
              value={deepseekApiKey}
              onChange={(event) => setDeepseekApiKey(event.target.value)}
              placeholder="输入新 Key（留空则不修改）"
            />
            <Input
              value={deepseekBaseUrl}
              onChange={(event) => setDeepseekBaseUrl(event.target.value)}
              placeholder="DeepSeek Base URL"
            />
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">智谱 GLM</div>
            <div className="text-xs text-muted-foreground">
              当前：{providers.zhipuApiKeyMasked}（来源：{sourceText(providers.zhipuApiKeySource)}）
            </div>
            <Input
              type="password"
              value={zhipuApiKey}
              onChange={(event) => setZhipuApiKey(event.target.value)}
              placeholder="输入新 Key（留空则不修改）"
            />
            <Input
              value={zhipuBaseUrl}
              onChange={(event) => setZhipuBaseUrl(event.target.value)}
              placeholder="GLM Base URL"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            说明：Key 在后台加密存储。你可以只改模型选择，不改 Key；也可以只改 Key，不改模型。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">OpenAI 兼容模型</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customOpenAIModels.map((item, index) => (
            <div
              key={item.localId}
              className="rounded-md border p-3 space-y-3 bg-muted/20"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">自定义模型 #{index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCustomOpenAIModel(item.localId)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">模型 ID（唯一）</span>
                  <Input
                    value={item.id}
                    onChange={(event) =>
                      updateCustomOpenAIModel(item.localId, {
                        id: event.target.value.toLowerCase(),
                      })
                    }
                    placeholder="如：qwen-plus"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">显示名称</span>
                  <Input
                    value={item.name}
                    onChange={(event) =>
                      updateCustomOpenAIModel(item.localId, {
                        name: event.target.value,
                      })
                    }
                    placeholder="如：通义千问 Plus"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">底层 Model Name</span>
                  <Input
                    value={item.modelName}
                    onChange={(event) =>
                      updateCustomOpenAIModel(item.localId, {
                        modelName: event.target.value,
                      })
                    }
                    placeholder="如：qwen-plus"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Base URL</span>
                  <Input
                    value={item.baseUrl}
                    onChange={(event) =>
                      updateCustomOpenAIModel(item.localId, {
                        baseUrl: event.target.value,
                      })
                    }
                    placeholder="如：https://dashscope.aliyuncs.com/compatible-mode/v1"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">
                    输入单价（元 / 1M tokens）
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.000001"
                    value={item.inputCostPerMToken}
                    onChange={(event) =>
                      updateCustomOpenAIModel(item.localId, {
                        inputCostPerMToken: Number(event.target.value || 0),
                      })
                    }
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">
                    输出单价（元 / 1M tokens）
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.000001"
                    value={item.outputCostPerMToken}
                    onChange={(event) =>
                      updateCustomOpenAIModel(item.localId, {
                        outputCostPerMToken: Number(event.target.value || 0),
                      })
                    }
                  />
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  当前 Key：{item.apiKeyMasked}（来源：
                  {customKeySourceText(item.apiKeySource)}）
                </p>
                <Input
                  type="password"
                  value={item.apiKey}
                  onChange={(event) =>
                    updateCustomOpenAIModel(item.localId, {
                      apiKey: event.target.value,
                    })
                  }
                  placeholder="输入新 Key（留空则保持已保存 Key）"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(event) =>
                    updateCustomOpenAIModel(item.localId, {
                      enabled: event.target.checked,
                    })
                  }
                />
                启用该模型（启用后才会出现在代码/论文模型下拉中）
              </label>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addCustomOpenAIModel}>
            <Plus className="h-4 w-4 mr-1" />
            新增 OpenAI 兼容模型
          </Button>

          <p className="text-xs text-muted-foreground">
            提示：新增模型后，保存成功才会出现在上方“模型选择”下拉中。模型 ID
            建议使用小写英文、数字、`-`、`_`。
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={() => void save()} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存模型配置
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
