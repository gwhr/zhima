"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type HomepageStep = {
  title: string;
  description: string;
  imageUrl: string;
};

type TokenRechargePlan = {
  id: string;
  name: string;
  priceYuan: number;
  points: number;
  description: string;
  published: boolean;
};

type PlatformConfig = {
  codeGenModelId: string;
  thesisGenModelId: string;
  defaultUserTokenBudget: number;
  freeWorkspaceLimit: number;
  codeGenTokenReserve: number;
  thesisGenTokenReserve: number;
  chatTokenReserve: number;
  tokenBillingMultiplier: number;
  tokenPointsPerYuan: number;
  dailyUserPointLimit: number;
  defaultUserTaskConcurrencyLimit: number;
  taskFailureRetryLimit: number;
  singleTaskTokenHardLimit: number;
  enableCodeGeneration: boolean;
  enableThesisGeneration: boolean;
  enablePreviewBuild: boolean;
  requireRechargeForDownload: boolean;
  maintenanceNoticeEnabled: boolean;
  maintenanceNoticeText: string;
  supportContactEnabled: boolean;
  supportContactTitle: string;
  supportContactDescription: string;
  supportContactQrUrl: string;
  homepageProcessEnabled: boolean;
  homepageProcessTitle: string;
  homepageProcessDescription: string;
  homepageProcessSteps: HomepageStep[];
  tokenRechargePlans: TokenRechargePlan[];
};

type SectionId =
  | "models"
  | "billing"
  | "plans"
  | "risk"
  | "feature"
  | "support"
  | "homepage";

const sectionList: Array<{ id: SectionId; title: string; description: string }> = [
  {
    id: "models",
    title: "模型与默认额度",
    description: "代码模型、论文模型与免费额度",
  },
  {
    id: "billing",
    title: "计费规则",
    description: "倍率、点数换算与单日上限",
  },
  {
    id: "plans",
    title: "Token 套餐",
    description: "表格管理套餐，可新增发布",
  },
  {
    id: "risk",
    title: "风控阈值",
    description: "并发、重试与单任务上限",
  },
  {
    id: "feature",
    title: "功能开关",
    description: "代码/论文/预览/下载门槛",
  },
  {
    id: "support",
    title: "一对一辅导",
    description: "客服文案和二维码",
  },
  {
    id: "homepage",
    title: "首页流程模块",
    description: "图文步骤和运营说明",
  },
];

function normalizePlanId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64);
}

function createPlan(index: number): TokenRechargePlan {
  return {
    id: `plan-${Date.now()}-${index + 1}`,
    name: `套餐 ${index + 1}`,
    priceYuan: 9.9,
    points: 10000,
    description: "",
    published: false,
  };
}

function createStep(index: number): HomepageStep {
  return {
    title: `步骤 ${index + 1}`,
    description: "请补充该步骤说明",
    imageUrl: "",
  };
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function AdminPlatformPage() {
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<SectionId>("models");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [supportUploading, setSupportUploading] = useState(false);
  const [stepUploadingIndex, setStepUploadingIndex] = useState<number | null>(null);

  const estimateFormula = useMemo(() => {
    if (!config) return "";
    return `平台点数 = 模型成本(元) × ${config.tokenBillingMultiplier} × ${config.tokenPointsPerYuan}`;
  }, [config]);

  const setField = <K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setNumberField = <K extends keyof PlatformConfig>(key: K, rawValue: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: parseNumber(rawValue, Number(prev[key])) };
    });
  };

  async function parseJsonSafe(response: Response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function uploadImage(file: File, scope: "support" | "homepage-step") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("scope", scope);
    const response = await fetch("/api/admin/platform-assets/upload", {
      method: "POST",
      body: formData,
    });
    const result = await parseJsonSafe(response);
    if (!response.ok || !result?.success || !result?.data?.url) {
      throw new Error(result?.error || "上传失败");
    }
    return String(result.data.url);
  }

  async function loadConfig() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/platform-config");
      const result = await parseJsonSafe(response);
      if (!response.ok || !result?.success || !result?.data?.config) {
        throw new Error(result?.error || "加载平台配置失败");
      }
      setConfig(result.data.config as PlatformConfig);
      setModelOptions(Array.isArray(result.data.modelOptions) ? result.data.modelOptions : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载平台配置失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/platform-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const result = await parseJsonSafe(response);
      if (!response.ok || !result?.success || !result?.data?.config) {
        throw new Error(result?.error || "保存失败");
      }
      setConfig(result.data.config as PlatformConfig);
      setMessage("平台配置已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function updatePlan(index: number, patch: Partial<TokenRechargePlan>) {
    setConfig((prev) => {
      if (!prev) return prev;
      const nextPlans = [...prev.tokenRechargePlans];
      if (!nextPlans[index]) return prev;
      nextPlans[index] = { ...nextPlans[index], ...patch };
      return { ...prev, tokenRechargePlans: nextPlans };
    });
  }

  function addPlan() {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tokenRechargePlans: [...prev.tokenRechargePlans, createPlan(prev.tokenRechargePlans.length)],
      };
    });
  }

  function removePlan(index: number) {
    setConfig((prev) => {
      if (!prev || prev.tokenRechargePlans.length <= 1) return prev;
      return {
        ...prev,
        tokenRechargePlans: prev.tokenRechargePlans.filter((_, currentIndex) => currentIndex !== index),
      };
    });
  }

  function updateStep(index: number, patch: Partial<HomepageStep>) {
    setConfig((prev) => {
      if (!prev) return prev;
      const nextSteps = [...prev.homepageProcessSteps];
      if (!nextSteps[index]) return prev;
      nextSteps[index] = { ...nextSteps[index], ...patch };
      return { ...prev, homepageProcessSteps: nextSteps };
    });
  }

  function addStep() {
    setConfig((prev) => {
      if (!prev || prev.homepageProcessSteps.length >= 8) return prev;
      return {
        ...prev,
        homepageProcessSteps: [...prev.homepageProcessSteps, createStep(prev.homepageProcessSteps.length)],
      };
    });
  }

  function removeStep(index: number) {
    setConfig((prev) => {
      if (!prev || prev.homepageProcessSteps.length <= 1) return prev;
      return {
        ...prev,
        homepageProcessSteps: prev.homepageProcessSteps.filter((_, currentIndex) => currentIndex !== index),
      };
    });
  }

  async function onSupportQrUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setSupportUploading(true);
    setMessage(null);
    try {
      const imageUrl = await uploadImage(file, "support");
      setField("supportContactQrUrl", imageUrl);
      setMessage("二维码上传成功，记得点击保存配置");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "二维码上传失败");
    } finally {
      setSupportUploading(false);
    }
  }

  async function onStepImageUpload(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStepUploadingIndex(index);
    setMessage(null);
    try {
      const imageUrl = await uploadImage(file, "homepage-step");
      updateStep(index, { imageUrl });
      setMessage(`步骤 ${index + 1} 配图上传成功，记得点击保存配置`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "步骤配图上传失败");
    } finally {
      setStepUploadingIndex(null);
    }
  }

  function renderModelsSection() {
    if (!config) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>模型与默认额度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">代码生成模型</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={config.codeGenModelId}
                onChange={(event) => setField("codeGenModelId", event.target.value)}
              >
                {modelOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">论文生成模型</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={config.thesisGenModelId}
                onChange={(event) => setField("thesisGenModelId", event.target.value)}
              >
                {modelOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">新用户默认总点数</span>
              <Input
                type="number"
                min={1}
                value={config.defaultUserTokenBudget}
                onChange={(event) => setNumberField("defaultUserTokenBudget", event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">免费用户可创建工作空间数</span>
              <Input
                type="number"
                min={0}
                value={config.freeWorkspaceLimit}
                onChange={(event) => setNumberField("freeWorkspaceLimit", event.target.value)}
              />
            </label>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderBillingSection() {
    if (!config) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>计费规则</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">计费倍率</span>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={config.tokenBillingMultiplier}
                onChange={(event) => setNumberField("tokenBillingMultiplier", event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">每 1 元折算点数</span>
              <Input
                type="number"
                min={1}
                value={config.tokenPointsPerYuan}
                onChange={(event) => setNumberField("tokenPointsPerYuan", event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">单用户单日点数上限</span>
              <Input
                type="number"
                min={1}
                value={config.dailyUserPointLimit}
                onChange={(event) => setNumberField("dailyUserPointLimit", event.target.value)}
              />
            </label>
          </div>
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {estimateFormula}
          </p>
        </CardContent>
      </Card>
    );
  }

  function renderPlansSection() {
    if (!config) return null;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Token 套餐配置（支持新增）</CardTitle>
          <Button type="button" variant="outline" onClick={addPlan}>
            <Plus className="mr-2 h-4 w-4" />
            新增套餐
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="px-3 py-2 text-left">套餐 ID</th>
                  <th className="px-3 py-2 text-left">显示名称</th>
                  <th className="px-3 py-2 text-right">价格（元）</th>
                  <th className="px-3 py-2 text-right">点数</th>
                  <th className="px-3 py-2 text-center">发布</th>
                  <th className="px-3 py-2 text-left">描述</th>
                  <th className="px-3 py-2 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {config.tokenRechargePlans.map((plan, index) => (
                  <tr key={`${plan.id}-${index}`} className="border-b last:border-0">
                    <td className="px-3 py-2 align-top">
                      <Input
                        value={plan.id}
                        onChange={(event) =>
                          updatePlan(index, {
                            id: normalizePlanId(event.target.value),
                          })
                        }
                        placeholder="如 standard"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        value={plan.name}
                        onChange={(event) => updatePlan(index, { name: event.target.value })}
                        placeholder="套餐名称"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={plan.priceYuan}
                        onChange={(event) =>
                          updatePlan(index, {
                            priceYuan: Math.max(0.01, parseNumber(event.target.value, 0.01)),
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={plan.points}
                        onChange={(event) =>
                          updatePlan(index, {
                            points: Math.max(1, Math.floor(parseNumber(event.target.value, 1))),
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-center">
                      <input
                        type="checkbox"
                        checked={plan.published}
                        onChange={(event) => updatePlan(index, { published: event.target.checked })}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        value={plan.description}
                        onChange={(event) =>
                          updatePlan(index, { description: event.target.value })
                        }
                        placeholder="可选描述"
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={config.tokenRechargePlans.length <= 1}
                        onClick={() => removePlan(index)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            只有发布状态的套餐会在用户充值页展示，未发布套餐仅后台可见。
          </p>
        </CardContent>
      </Card>
    );
  }

  function renderRiskSection() {
    if (!config) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>风控阈值</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">默认并发上限</span>
            <Input
              type="number"
              min={1}
              value={config.defaultUserTaskConcurrencyLimit}
              onChange={(event) =>
                setNumberField("defaultUserTaskConcurrencyLimit", event.target.value)
              }
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">同类任务失败重试上限</span>
            <Input
              type="number"
              min={0}
              value={config.taskFailureRetryLimit}
              onChange={(event) => setNumberField("taskFailureRetryLimit", event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">单任务 Token 硬上限</span>
            <Input
              type="number"
              min={1000}
              value={config.singleTaskTokenHardLimit}
              onChange={(event) =>
                setNumberField("singleTaskTokenHardLimit", event.target.value)
              }
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">代码生成预冻结点数</span>
            <Input
              type="number"
              min={1}
              value={config.codeGenTokenReserve}
              onChange={(event) => setNumberField("codeGenTokenReserve", event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">论文生成预冻结点数</span>
            <Input
              type="number"
              min={1}
              value={config.thesisGenTokenReserve}
              onChange={(event) => setNumberField("thesisGenTokenReserve", event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">AI 对话预冻结点数</span>
            <Input
              type="number"
              min={1}
              value={config.chatTokenReserve}
              onChange={(event) => setNumberField("chatTokenReserve", event.target.value)}
            />
          </label>
        </CardContent>
      </Card>
    );
  }

  function renderFeatureSection() {
    if (!config) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>功能开关</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.enableCodeGeneration}
                onChange={(event) => setField("enableCodeGeneration", event.target.checked)}
              />
              启用代码生成
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.enableThesisGeneration}
                onChange={(event) => setField("enableThesisGeneration", event.target.checked)}
              />
              启用论文生成
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.enablePreviewBuild}
                onChange={(event) => setField("enablePreviewBuild", event.target.checked)}
              />
              启用运行预览
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.requireRechargeForDownload}
                onChange={(event) => setField("requireRechargeForDownload", event.target.checked)}
              />
              下载前需充值
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={config.maintenanceNoticeEnabled}
                onChange={(event) => setField("maintenanceNoticeEnabled", event.target.checked)}
              />
              启用维护公告
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">维护公告内容</span>
            <Textarea
              rows={4}
              value={config.maintenanceNoticeText}
              onChange={(event) => setField("maintenanceNoticeText", event.target.value)}
              placeholder="维护公告会显示在前台页面"
            />
          </label>
        </CardContent>
      </Card>
    );
  }

  function renderSupportSection() {
    if (!config) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>一对一辅导模块</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.supportContactEnabled}
              onChange={(event) => setField("supportContactEnabled", event.target.checked)}
            />
            前台显示一对一辅导模块
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">模块标题</span>
              <Input
                value={config.supportContactTitle}
                onChange={(event) => setField("supportContactTitle", event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">二维码图片地址</span>
              <Input
                value={config.supportContactQrUrl}
                onChange={(event) => setField("supportContactQrUrl", event.target.value)}
                placeholder="/uploads/platform/support/xxx.png"
              />
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">模块描述</span>
            <Textarea
              rows={3}
              value={config.supportContactDescription}
              onChange={(event) => setField("supportContactDescription", event.target.value)}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <UploadCloud className="h-4 w-4" />
              上传二维码
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={onSupportQrUpload}
              />
            </label>
            {supportUploading && (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                上传中...
              </span>
            )}
          </div>

          {config.supportContactQrUrl ? (
            <div className="rounded-md border bg-muted/20 p-3">
              <img
                src={config.supportContactQrUrl}
                alt="辅导二维码"
                className="h-32 w-32 rounded-md border object-cover"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  function renderHomepageSection() {
    if (!config) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>首页流程模块</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.homepageProcessEnabled}
              onChange={(event) => setField("homepageProcessEnabled", event.target.checked)}
            />
            前台显示“操作流程”模块
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">流程模块标题</span>
              <Input
                value={config.homepageProcessTitle}
                onChange={(event) => setField("homepageProcessTitle", event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted-foreground">流程模块副标题</span>
              <Input
                value={config.homepageProcessDescription}
                onChange={(event) => setField("homepageProcessDescription", event.target.value)}
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">流程步骤（最多 8 条）</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStep}
              disabled={config.homepageProcessSteps.length >= 8}
            >
              <Plus className="mr-1 h-4 w-4" />
              新增步骤
            </Button>
          </div>

          <div className="space-y-3">
            {config.homepageProcessSteps.map((step, index) => (
              <div key={`${step.title}-${index}`} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">步骤 {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(index)}
                    disabled={config.homepageProcessSteps.length <= 1}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    删除
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">标题</span>
                    <Input
                      value={step.title}
                      onChange={(event) => updateStep(index, { title: event.target.value })}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">配图地址</span>
                    <Input
                      value={step.imageUrl}
                      onChange={(event) => updateStep(index, { imageUrl: event.target.value })}
                      placeholder="/uploads/platform/homepage-step/xxx.png"
                    />
                  </label>
                </div>

                <label className="mt-3 block space-y-1">
                  <span className="text-xs text-muted-foreground">描述</span>
                  <Textarea
                    rows={2}
                    value={step.description}
                    onChange={(event) => updateStep(index, { description: event.target.value })}
                  />
                </label>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs">
                    <UploadCloud className="h-4 w-4" />
                    上传步骤配图
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(event) => {
                        void onStepImageUpload(index, event);
                      }}
                    />
                  </label>
                  {stepUploadingIndex === index ? (
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      上传中...
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderSection() {
    if (!config) return null;
    switch (activeSection) {
      case "models":
        return renderModelsSection();
      case "billing":
        return renderBillingSection();
      case "plans":
        return renderPlansSection();
      case "risk":
        return renderRiskSection();
      case "feature":
        return renderFeatureSection();
      case "support":
        return renderSupportSection();
      case "homepage":
        return renderHomepageSection();
      default:
        return renderModelsSection();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载平台配置...
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-destructive">平台配置加载失败，请刷新重试。</p>
        <Button type="button" variant="outline" onClick={() => void loadConfig()}>
          重新加载
        </Button>
      </div>
    );
  }

  const activeMeta = sectionList.find((item) => item.id === activeSection) ?? sectionList[0];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">平台配置</h1>
          <p className="text-sm text-muted-foreground">
            按模块拆分配置，避免单页过长，改完后统一保存。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void loadConfig()} disabled={saving}>
            刷新
          </Button>
          <Button type="button" onClick={() => void saveConfig()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存配置"
            )}
          </Button>
        </div>
      </div>

      {message ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">{message}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">配置菜单</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sectionList.map((section) => {
              const active = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-medium">{section.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-sm font-medium">{activeMeta.title}</p>
            <p className="text-xs text-muted-foreground">{activeMeta.description}</p>
          </div>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
