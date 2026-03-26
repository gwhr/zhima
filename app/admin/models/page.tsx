"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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

type ModelsResponse = {
  modelOptions: string[];
  config: {
    codeGenModelId: string;
    thesisGenModelId: string;
  };
  providers: ModelProviderView;
};

function sourceText(source: KeySource) {
  if (source === "admin") return "后台覆盖";
  if (source === "env") return "环境变量";
  return "未配置";
}

export default function AdminModelsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [codeGenModelId, setCodeGenModelId] = useState("");
  const [thesisGenModelId, setThesisGenModelId] = useState("");
  const [providers, setProviders] = useState<ModelProviderView | null>(null);

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
    zhipuApiKey,
    zhipuBaseUrl,
  ]);

  async function loadData() {
    setLoading(true);
    const response = await fetch("/api/admin/models");
    const result = await response.json();
    if (result.success) {
      const data = result.data as ModelsResponse;
      setModelOptions(data.modelOptions || []);
      setCodeGenModelId(data.config.codeGenModelId);
      setThesisGenModelId(data.config.thesisGenModelId);
      setProviders(data.providers);
      setDeepseekBaseUrl(data.providers.deepseekBaseUrl);
      setZhipuBaseUrl(data.providers.zhipuBaseUrl);
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
      setCodeGenModelId(data.config.codeGenModelId);
      setThesisGenModelId(data.config.thesisGenModelId);
      setProviders(data.providers);
      setDeepseekBaseUrl(data.providers.deepseekBaseUrl);
      setZhipuBaseUrl(data.providers.zhipuBaseUrl);

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
              {modelOptions.map((modelId) => (
                <option key={modelId} value={modelId}>
                  {modelId}
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
              {modelOptions.map((modelId) => (
                <option key={modelId} value={modelId}>
                  {modelId}
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
