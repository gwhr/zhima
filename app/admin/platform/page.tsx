"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface PlatformConfig {
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
  homepageProcessSteps: Array<{
    title: string;
    description: string;
    imageUrl: string;
  }>;
}

export default function AdminPlatformPage() {
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supportQrUploading, setSupportQrUploading] = useState(false);
  const [stepUploadingIndex, setStepUploadingIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadPlatformImage(
    file: File,
    scope: "support" | "homepage-step"
  ) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("scope", scope);

    const response = await fetch("/api/admin/platform-assets/upload", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    if (!result.success || !result.data?.url) {
      throw new Error(result.error || "图片上传失败");
    }
    return String(result.data.url);
  }

  async function loadConfig() {
    setLoading(true);
    const response = await fetch("/api/admin/platform-config");
    const result = await response.json();
    if (result.success) {
      setConfig(result.data.config);
      setModelOptions(result.data.modelOptions);
    } else {
      setMessage(result.error || "加载平台配置失败");
    }
    setLoading(false);
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
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "保存失败");
      }
      setConfig(result.data.config);
      setMessage("平台配置已保存");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function updateProcessStep(
    index: number,
    patch: Partial<PlatformConfig["homepageProcessSteps"][number]>
  ) {
    setConfig((prev) => {
      if (!prev) return prev;
      const nextSteps = [...prev.homepageProcessSteps];
      const current = nextSteps[index];
      if (!current) return prev;
      nextSteps[index] = { ...current, ...patch };
      return {
        ...prev,
        homepageProcessSteps: nextSteps,
      };
    });
  }

  function removeProcessStep(index: number) {
    setConfig((prev) => {
      if (!prev) return prev;
      if (prev.homepageProcessSteps.length <= 1) return prev;
      return {
        ...prev,
        homepageProcessSteps: prev.homepageProcessSteps.filter(
          (_, stepIndex) => stepIndex !== index
        ),
      };
    });
  }

  function addProcessStep() {
    setConfig((prev) => {
      if (!prev) return prev;
      if (prev.homepageProcessSteps.length >= 8) return prev;
      return {
        ...prev,
        homepageProcessSteps: [
          ...prev.homepageProcessSteps,
          {
            title: `步骤 ${prev.homepageProcessSteps.length + 1}`,
            description: "请补充该步骤说明",
            imageUrl: "",
          },
        ],
      };
    });
  }

  async function handleSupportQrUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !config) return;

    setSupportQrUploading(true);
    setMessage(null);
    try {
      const url = await uploadPlatformImage(file, "support");
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              supportContactQrUrl: url,
            }
          : prev
      );
      setMessage("二维码上传成功，请记得保存配置");
    } catch (uploadError) {
      setMessage(
        uploadError instanceof Error ? uploadError.message : "二维码上传失败"
      );
    } finally {
      setSupportQrUploading(false);
    }
  }

  async function handleProcessStepImageUpload(
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStepUploadingIndex(index);
    setMessage(null);
    try {
      const url = await uploadPlatformImage(file, "homepage-step");
      updateProcessStep(index, { imageUrl: url });
      setMessage(`步骤 ${index + 1} 图片上传成功，请记得保存配置`);
    } catch (uploadError) {
      setMessage(
        uploadError instanceof Error ? uploadError.message : "流程图片上传失败"
      );
    } finally {
      setStepUploadingIndex(null);
    }
  }

  const estimatedPointFormula = useMemo(() => {
    if (!config) return "";
    return `平台点数 = 模型成本(元) × ${config.tokenBillingMultiplier} × ${config.tokenPointsPerYuan}`;
  }, [config]);

  if (loading || !config) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载配置...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">平台配置</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">模型与默认额度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">代码生成模型</span>
              <select
                value={config.codeGenModelId}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          codeGenModelId: event.target.value,
                        }
                      : prev
                  )
                }
                className="h-10 w-full rounded-md border bg-background px-3"
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">论文生成模型</span>
              <select
                value={config.thesisGenModelId}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          thesisGenModelId: event.target.value,
                        }
                      : prev
                  )
                }
                className="h-10 w-full rounded-md border bg-background px-3"
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">用户默认总额度</span>
              <Input
                type="number"
                min={1}
                value={config.defaultUserTokenBudget}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          defaultUserTokenBudget: Number(event.target.value || 0),
                        }
                      : prev
                  )
                }
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">免费用户工作空间上限</span>
              <Input
                type="number"
                min={1}
                value={config.freeWorkspaceLimit}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          freeWorkspaceLimit: Number(event.target.value || 0),
                        }
                      : prev
                  )
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">代码任务冻结点数</span>
              <Input
                type="number"
                min={1}
                value={config.codeGenTokenReserve}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          codeGenTokenReserve: Number(event.target.value || 0),
                        }
                      : prev
                  )
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">论文任务冻结点数</span>
              <Input
                type="number"
                min={1}
                value={config.thesisGenTokenReserve}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          thesisGenTokenReserve: Number(event.target.value || 0),
                        }
                      : prev
                  )
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">AI 对话冻结点数</span>
              <Input
                type="number"
                min={1}
                value={config.chatTokenReserve}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          chatTokenReserve: Number(event.target.value || 0),
                        }
                      : prev
                  )
                }
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Token 计费规则</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">计费倍率</span>
              <Input
                type="number"
                min={0.1}
                step="0.1"
                value={config.tokenBillingMultiplier}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          tokenBillingMultiplier: Number(event.target.value || 0),
                        }
                      : prev
                  )
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">点数汇率（点/元）</span>
              <Input
                type="number"
                min={1}
                value={config.tokenPointsPerYuan}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          tokenPointsPerYuan: Number(event.target.value || 0),
                        }
                      : prev
                  )
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">单用户日扣点上限</span>
              <Input
                type="number"
                min={1}
                value={config.dailyUserPointLimit}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          dailyUserPointLimit: Number(event.target.value || 0),
                        }
                      : prev
                  )
                }
              />
            </label>
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            {estimatedPointFormula}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">风控阈值</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">默认并发上限</span>
              <Input
                type="number"
                min={1}
                value={config.defaultUserTaskConcurrencyLimit}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          defaultUserTaskConcurrencyLimit: Number(
                            event.target.value || 0
                          ),
                        }
                      : prev
                  )
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">任务失败最大重试次数</span>
              <Input
                type="number"
                min={0}
                value={config.taskFailureRetryLimit}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          taskFailureRetryLimit: Number(event.target.value || 0),
                        }
                      : prev
                  )
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">单任务 Token 硬上限</span>
              <Input
                type="number"
                min={1}
                value={config.singleTaskTokenHardLimit}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          singleTaskTokenHardLimit: Number(
                            event.target.value || 0
                          ),
                        }
                      : prev
                  )
                }
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">功能开关</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.enableCodeGeneration}
              onChange={(event) =>
                setConfig((prev) =>
                  prev
                    ? { ...prev, enableCodeGeneration: event.target.checked }
                    : prev
                )
              }
            />
            启用代码生成
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.enableThesisGeneration}
              onChange={(event) =>
                setConfig((prev) =>
                  prev
                    ? { ...prev, enableThesisGeneration: event.target.checked }
                    : prev
                )
              }
            />
            启用论文生成
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.enablePreviewBuild}
              onChange={(event) =>
                setConfig((prev) =>
                  prev
                    ? { ...prev, enablePreviewBuild: event.target.checked }
                    : prev
                )
              }
            />
            启用预览构建
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.requireRechargeForDownload}
              onChange={(event) =>
                setConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        requireRechargeForDownload: event.target.checked,
                      }
                    : prev
                )
              }
            />
            下载完整项目需先充值
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.maintenanceNoticeEnabled}
              onChange={(event) =>
                setConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        maintenanceNoticeEnabled: event.target.checked,
                      }
                    : prev
                )
              }
            />
            启用维护公告
          </label>

          <Textarea
            value={config.maintenanceNoticeText}
            onChange={(event) =>
              setConfig((prev) =>
                prev
                  ? {
                      ...prev,
                      maintenanceNoticeText: event.target.value,
                    }
                  : prev
              )
            }
            className="min-h-[90px]"
            placeholder="维护公告内容（可选）"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">一对一辅导卡片</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.supportContactEnabled}
              onChange={(event) =>
                setConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        supportContactEnabled: event.target.checked,
                      }
                    : prev
                )
              }
            />
            在工作空间右侧显示“一对一辅导”卡片
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">卡片标题</span>
              <Input
                value={config.supportContactTitle}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          supportContactTitle: event.target.value,
                        }
                      : prev
                  )
                }
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">二维码图片地址</span>
              <Input
                value={config.supportContactQrUrl}
                placeholder="/api/platform-assets/..."
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          supportContactQrUrl: event.target.value,
                        }
                      : prev
                  )
                }
              />
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleSupportQrUpload(event)}
                  disabled={supportQrUploading}
                  className="h-9"
                />
                {supportQrUploading && (
                  <span className="text-xs text-muted-foreground">上传中...</span>
                )}
              </div>
            </label>
          </div>

          <label className="space-y-1 text-sm block">
            <span className="text-muted-foreground">卡片描述</span>
            <Textarea
              value={config.supportContactDescription}
              className="min-h-[88px]"
              onChange={(event) =>
                setConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        supportContactDescription: event.target.value,
                      }
                    : prev
                )
              }
            />
          </label>

          {config.supportContactQrUrl ? (
            <div className="inline-flex max-w-[220px] flex-col gap-2 rounded-md border bg-muted/30 p-2">
              <img
                src={config.supportContactQrUrl}
                alt="辅导二维码预览"
                className="h-40 w-40 rounded object-contain"
              />
              <span className="text-xs text-muted-foreground">二维码预览</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">首页操作流程模块</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.homepageProcessEnabled}
              onChange={(event) =>
                setConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        homepageProcessEnabled: event.target.checked,
                      }
                    : prev
                )
              }
            />
            在首页展示“操作流程”模块
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">模块标题</span>
              <Input
                value={config.homepageProcessTitle}
                onChange={(event) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          homepageProcessTitle: event.target.value,
                        }
                      : prev
                  )
                }
              />
            </label>
          </div>

          <label className="space-y-1 text-sm block">
            <span className="text-muted-foreground">模块描述</span>
            <Textarea
              value={config.homepageProcessDescription}
              className="min-h-[72px]"
              onChange={(event) =>
                setConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        homepageProcessDescription: event.target.value,
                      }
                    : prev
                )
              }
            />
          </label>

          <div className="space-y-3">
            {config.homepageProcessSteps.map((step, index) => (
              <div key={`${index}-${step.title}`} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium">步骤 {index + 1}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeProcessStep(index)}
                    disabled={config.homepageProcessSteps.length <= 1}
                  >
                    删除
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">步骤标题</span>
                    <Input
                      value={step.title}
                      onChange={(event) =>
                        updateProcessStep(index, { title: event.target.value })
                      }
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">步骤配图地址</span>
                    <Input
                      value={step.imageUrl}
                      placeholder="/api/platform-assets/..."
                      onChange={(event) =>
                        updateProcessStep(index, { imageUrl: event.target.value })
                      }
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        className="h-9"
                        onChange={(event) =>
                          void handleProcessStepImageUpload(index, event)
                        }
                        disabled={stepUploadingIndex === index}
                      />
                      {stepUploadingIndex === index && (
                        <span className="text-xs text-muted-foreground">
                          上传中...
                        </span>
                      )}
                    </div>
                  </label>
                </div>

                <label className="mt-3 block space-y-1 text-sm">
                  <span className="text-muted-foreground">步骤说明</span>
                  <Textarea
                    value={step.description}
                    className="min-h-[72px]"
                    onChange={(event) =>
                      updateProcessStep(index, { description: event.target.value })
                    }
                  />
                </label>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addProcessStep}
            disabled={config.homepageProcessSteps.length >= 8}
          >
            新增步骤
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={() => void saveConfig()} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存配置
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
