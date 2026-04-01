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

type ModelOptionDetail = { id: string; name: string; source: "builtin" | "custom" };

type BuiltinPricingRow = {
  id: string;
  name: string;
  inputCostPerMToken: number;
  outputCostPerMToken: number;
  cacheHitCostPerMToken: number;
};

type CustomOpenAIModelView = {
  id: string;
  name: string;
  modelName: string;
  baseUrl: string;
  inputCostPerMToken: number;
  outputCostPerMToken: number;
  cacheHitCostPerMToken: number;
  enabled: boolean;
  apiKeyMasked: string;
  apiKeySource: "admin" | "none";
};

type CustomOpenAIModelForm = CustomOpenAIModelView & {
  localId: string;
  apiKey: string;
};

type ModelsResponse = {
  modelOptions: string[];
  modelOptionDetails?: ModelOptionDetail[];
  builtinPricing?: BuiltinPricingRow[];
  config: { codeGenModelId: string; thesisGenModelId: string };
  providers: ModelProviderView;
  customOpenAIModels?: CustomOpenAIModelView[];
};

type TestStatus = { ok: boolean; text: string };

function keySourceText(source: KeySource) {
  if (source === "admin") return "后台配置";
  if (source === "env") return "环境变量";
  return "未配置";
}

function customKeySourceText(source: "admin" | "none") {
  return source === "admin" ? "后台已保存" : "未配置";
}

function parseNonNegativeNumber(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function toCustomFormModel(item?: Partial<CustomOpenAIModelView>): CustomOpenAIModelForm {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: item?.id || "",
    name: item?.name || "",
    modelName: item?.modelName || "",
    baseUrl: item?.baseUrl || "https://api.openai.com/v1",
    inputCostPerMToken: item?.inputCostPerMToken ?? 0,
    outputCostPerMToken: item?.outputCostPerMToken ?? 0,
    cacheHitCostPerMToken: item?.cacheHitCostPerMToken ?? 0,
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
  const [testingTarget, setTestingTarget] = useState<string | null>(null);
  const [testStatusMap, setTestStatusMap] = useState<Record<string, TestStatus>>({});

  const [modelOptions, setModelOptions] = useState<ModelOptionDetail[]>([]);
  const [builtinPricing, setBuiltinPricing] = useState<BuiltinPricingRow[]>([]);
  const [codeGenModelId, setCodeGenModelId] = useState("");
  const [thesisGenModelId, setThesisGenModelId] = useState("");
  const [providers, setProviders] = useState<ModelProviderView | null>(null);
  const [customOpenAIModels, setCustomOpenAIModels] = useState<CustomOpenAIModelForm[]>([]);

  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [zhipuApiKey, setZhipuApiKey] = useState("");
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState("");
  const [zhipuBaseUrl, setZhipuBaseUrl] = useState("");

  const optionLabel = useMemo(
    () =>
      new Map(
        modelOptions.map((item) => [
          item.id,
          item.source === "custom" ? `${item.name} (${item.id})` : item.name,
        ])
      ),
    [modelOptions]
  );

  async function loadData() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/models");
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success || !result?.data) {
        throw new Error(result?.error || `加载失败（HTTP ${response.status}）`);
      }
      const data = result.data as ModelsResponse;
      const options = data.modelOptionDetails?.length
        ? data.modelOptionDetails
        : (data.modelOptions || []).map((id) => ({ id, name: id, source: "builtin" as const }));

      setModelOptions(options);
      setBuiltinPricing(data.builtinPricing || []);
      setCodeGenModelId(data.config.codeGenModelId);
      setThesisGenModelId(data.config.thesisGenModelId);
      setProviders(data.providers);
      setDeepseekBaseUrl(data.providers.deepseekBaseUrl);
      setZhipuBaseUrl(data.providers.zhipuBaseUrl);
      setCustomOpenAIModels((data.customOpenAIModels || []).map((x) => toCustomFormModel(x)));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const payloadPreview = useMemo(
    () => ({
      codeGenModelId,
      thesisGenModelId,
      deepseekBaseUrl: deepseekBaseUrl.trim(),
      zhipuBaseUrl: zhipuBaseUrl.trim(),
      anthropicApiKey: anthropicApiKey.trim(),
      deepseekApiKey: deepseekApiKey.trim(),
      zhipuApiKey: zhipuApiKey.trim(),
      customOpenAIModels: customOpenAIModels.map((item) => ({
        id: item.id.trim().toLowerCase(),
        name: item.name.trim(),
        modelName: item.modelName.trim(),
        baseUrl: item.baseUrl.trim(),
        inputCostPerMToken: Number(item.inputCostPerMToken) || 0,
        outputCostPerMToken: Number(item.outputCostPerMToken) || 0,
        cacheHitCostPerMToken: Number(item.cacheHitCostPerMToken) || 0,
        enabled: item.enabled,
        apiKey: item.apiKey.trim(),
      })),
    }),
    [
      codeGenModelId,
      thesisGenModelId,
      deepseekBaseUrl,
      zhipuBaseUrl,
      anthropicApiKey,
      deepseekApiKey,
      zhipuApiKey,
      customOpenAIModels,
    ]
  );

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadPreview),
      });
      const raw = await response.text();
      const result = raw ? (JSON.parse(raw) as { success?: boolean; error?: string }) : null;
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || raw || `保存失败（HTTP ${response.status}）`);
      }
      setAnthropicApiKey("");
      setDeepseekApiKey("");
      setZhipuApiKey("");
      setMessage("模型配置已保存");
      await loadData();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function setTestStatus(key: string, status: TestStatus | null) {
    setTestStatusMap((prev) => {
      const next = { ...prev };
      if (!status) delete next[key];
      else next[key] = status;
      return next;
    });
  }

  async function testBuiltinModel(modelId: "opus" | "deepseek" | "glm") {
    const stateKey = `builtin:${modelId}`;
    setTestingTarget(stateKey);
    setTestStatus(stateKey, null);
    try {
      const payload: Record<string, unknown> = { kind: "builtin", modelId };
      if (modelId === "opus" && anthropicApiKey.trim()) payload.anthropicApiKey = anthropicApiKey.trim();
      if (modelId === "deepseek") {
        if (deepseekApiKey.trim()) payload.deepseekApiKey = deepseekApiKey.trim();
        payload.deepseekBaseUrl = deepseekBaseUrl.trim();
      }
      if (modelId === "glm") {
        if (zhipuApiKey.trim()) payload.zhipuApiKey = zhipuApiKey.trim();
        payload.zhipuBaseUrl = zhipuBaseUrl.trim();
      }
      const response = await fetch("/api/admin/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error || "连接测试失败");
      setTestStatus(stateKey, { ok: true, text: "连接成功" });
    } catch (e) {
      setTestStatus(stateKey, { ok: false, text: e instanceof Error ? e.message : "连接测试失败" });
    } finally {
      setTestingTarget(null);
    }
  }

  async function testCustomModel(item: CustomOpenAIModelForm) {
    const stateKey = `custom:${item.localId}`;
    setTestingTarget(stateKey);
    setTestStatus(stateKey, null);
    try {
      const payload: Record<string, unknown> = {
        kind: "custom",
        modelId: item.id.trim().toLowerCase(),
        modelName: item.modelName.trim(),
        baseUrl: item.baseUrl.trim(),
      };
      if (item.apiKey.trim()) payload.apiKey = item.apiKey.trim();
      const response = await fetch("/api/admin/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error || "连接测试失败");
      setTestStatus(stateKey, { ok: true, text: "连接成功" });
    } catch (e) {
      setTestStatus(stateKey, { ok: false, text: e instanceof Error ? e.message : "连接测试失败" });
    } finally {
      setTestingTarget(null);
    }
  }

  function addCustomOpenAIModel() {
    setCustomOpenAIModels((prev) => [...prev, toCustomFormModel()]);
  }

  function removeCustomOpenAIModel(localId: string) {
    setCustomOpenAIModels((prev) => prev.filter((item) => item.localId !== localId));
    setTestStatus(`custom:${localId}`, null);
  }

  function updateCustomOpenAIModel(localId: string, patch: Partial<CustomOpenAIModelForm>) {
    setCustomOpenAIModels((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item))
    );
  }

  if (loading || !providers) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载模型配置...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">模型管理</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">模型价格表（元 / 1M tokens）</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-2 py-3 text-left font-medium">模型</th>
                <th className="px-2 py-3 text-left font-medium">模型 ID</th>
                <th className="px-2 py-3 text-right font-medium">输入单价</th>
                <th className="px-2 py-3 text-right font-medium">输出单价</th>
                <th className="px-2 py-3 text-right font-medium">缓存命中单价</th>
                <th className="px-2 py-3 text-center font-medium">启用</th>
              </tr>
            </thead>
            <tbody>
              {builtinPricing.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-2 py-3">{item.name}</td>
                  <td className="px-2 py-3 font-mono text-xs">{item.id}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{item.inputCostPerMToken.toFixed(6)}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{item.outputCostPerMToken.toFixed(6)}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{item.cacheHitCostPerMToken.toFixed(6)}</td>
                  <td className="px-2 py-3 text-center text-muted-foreground">内置</td>
                </tr>
              ))}

              {customOpenAIModels.map((item, index) => (
                <tr key={item.localId} className="border-b last:border-0 bg-muted/10">
                  <td className="px-2 py-2">
                    <Input
                      value={item.name}
                      onChange={(event) =>
                        updateCustomOpenAIModel(item.localId, { name: event.target.value })
                      }
                      placeholder={`自定义模型 #${index + 1}`}
                    />
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">{item.id || "-"}</td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.000001"
                      value={item.inputCostPerMToken}
                      onChange={(event) =>
                        updateCustomOpenAIModel(item.localId, {
                          inputCostPerMToken: parseNonNegativeNumber(event.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.000001"
                      value={item.outputCostPerMToken}
                      onChange={(event) =>
                        updateCustomOpenAIModel(item.localId, {
                          outputCostPerMToken: parseNonNegativeNumber(event.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.000001"
                      value={item.cacheHitCostPerMToken}
                      onChange={(event) =>
                        updateCustomOpenAIModel(item.localId, {
                          cacheHitCostPerMToken: parseNonNegativeNumber(event.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(event) =>
                        updateCustomOpenAIModel(item.localId, { enabled: event.target.checked })
                      }
                    />
                  </td>
                </tr>
              ))}

              {builtinPricing.length === 0 && customOpenAIModels.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">
                    暂无模型价格配置
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {customOpenAIModels.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              自定义模型已在此显示并可直接编辑，改完后点击底部“保存模型配置”。
            </p>
          )}
        </CardContent>
      </Card>

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
          <CardTitle className="text-base">内置模型 Key 配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Anthropic (opus)</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void testBuiltinModel("opus")}
                disabled={Boolean(testingTarget && testingTarget !== "builtin:opus")}
              >
                {testingTarget === "builtin:opus" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                测试连接
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              当前：{providers.anthropicApiKeyMasked}（来源：{keySourceText(providers.anthropicApiKeySource)}）
            </div>
            <Input
              type="password"
              value={anthropicApiKey}
              onChange={(event) => setAnthropicApiKey(event.target.value)}
              placeholder="输入新 Key（留空则不修改）"
            />
            {testStatusMap["builtin:opus"] && (
              <p className={testStatusMap["builtin:opus"].ok ? "text-xs text-emerald-600" : "text-xs text-red-600"}>
                {testStatusMap["builtin:opus"].text}
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">DeepSeek</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void testBuiltinModel("deepseek")}
                disabled={Boolean(testingTarget && testingTarget !== "builtin:deepseek")}
              >
                {testingTarget === "builtin:deepseek" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                测试连接
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              当前：{providers.deepseekApiKeyMasked}（来源：{keySourceText(providers.deepseekApiKeySource)}）
            </div>
            <Input
              type="password"
              value={deepseekApiKey}
              onChange={(event) => setDeepseekApiKey(event.target.value)}
              placeholder="输入新 Key（留空则不修改）"
            />
            <Input value={deepseekBaseUrl} onChange={(event) => setDeepseekBaseUrl(event.target.value)} placeholder="DeepSeek Base URL" />
            {testStatusMap["builtin:deepseek"] && (
              <p className={testStatusMap["builtin:deepseek"].ok ? "text-xs text-emerald-600" : "text-xs text-red-600"}>
                {testStatusMap["builtin:deepseek"].text}
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">智谱 GLM</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void testBuiltinModel("glm")}
                disabled={Boolean(testingTarget && testingTarget !== "builtin:glm")}
              >
                {testingTarget === "builtin:glm" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                测试连接
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              当前：{providers.zhipuApiKeyMasked}（来源：{keySourceText(providers.zhipuApiKeySource)}）
            </div>
            <Input
              type="password"
              value={zhipuApiKey}
              onChange={(event) => setZhipuApiKey(event.target.value)}
              placeholder="输入新 Key（留空则不修改）"
            />
            <Input value={zhipuBaseUrl} onChange={(event) => setZhipuBaseUrl(event.target.value)} placeholder="GLM Base URL" />
            {testStatusMap["builtin:glm"] && (
              <p className={testStatusMap["builtin:glm"].ok ? "text-xs text-emerald-600" : "text-xs text-red-600"}>
                {testStatusMap["builtin:glm"].text}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">OpenAI 兼容模型</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customOpenAIModels.map((item, index) => (
            <div key={item.localId} className="space-y-3 rounded-md border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">自定义模型 #{index + 1}</p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => void testCustomModel(item)}>
                    {testingTarget === `custom:${item.localId}` && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    测试连接
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeCustomOpenAIModel(item.localId)}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    删除
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input value={item.id} onChange={(event) => updateCustomOpenAIModel(item.localId, { id: event.target.value.toLowerCase() })} placeholder="模型 ID（唯一）" />
                <Input value={item.name} onChange={(event) => updateCustomOpenAIModel(item.localId, { name: event.target.value })} placeholder="显示名称" />
                <Input value={item.modelName} onChange={(event) => updateCustomOpenAIModel(item.localId, { modelName: event.target.value })} placeholder="底层 Model Name" />
                <Input value={item.baseUrl} onChange={(event) => updateCustomOpenAIModel(item.localId, { baseUrl: event.target.value })} placeholder="Base URL" />
              </div>
              <p className="text-xs text-muted-foreground">当前 Key：{item.apiKeyMasked}（来源：{customKeySourceText(item.apiKeySource)}）</p>
              <Input type="password" value={item.apiKey} onChange={(event) => updateCustomOpenAIModel(item.localId, { apiKey: event.target.value })} placeholder="输入新 Key（留空则不修改）" />
              {testStatusMap[`custom:${item.localId}`] && (
                <p className={testStatusMap[`custom:${item.localId}`].ok ? "text-xs text-emerald-600" : "text-xs text-red-600"}>
                  {testStatusMap[`custom:${item.localId}`].text}
                </p>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addCustomOpenAIModel}>
            <Plus className="mr-1 h-4 w-4" />
            新增 OpenAI 兼容模型
          </Button>
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
