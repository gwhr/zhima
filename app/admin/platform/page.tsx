"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface PlatformConfig {
  codeGenModelId: string;
  thesisGenModelId: string;
  defaultUserTokenBudget: number;
  codeGenTokenReserve: number;
  thesisGenTokenReserve: number;
  defaultUserTaskConcurrencyLimit: number;
  taskFailureRetryLimit: number;
  singleTaskTokenHardLimit: number;
  enableCodeGeneration: boolean;
  enableThesisGeneration: boolean;
  enablePreviewBuild: boolean;
  maintenanceNoticeEnabled: boolean;
  maintenanceNoticeText: string;
}

export default function AdminPlatformPage() {
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadConfig() {
    setLoading(true);
    const response = await fetch("/api/admin/platform-config");
    const result = await response.json();
    if (result.success) {
      setConfig(result.data.config);
      setModelOptions(result.data.modelOptions);
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
      setMessage("平台配置已保存。");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载配置中...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">平台配置</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">模型与额度</CardTitle>
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

          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">默认用户 Token 总额度</span>
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
              <span className="text-muted-foreground">代码生成预留 Token</span>
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
              <span className="text-muted-foreground">论文生成预留 Token</span>
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
              <span className="text-muted-foreground">
                默认单用户并发任务上限
              </span>
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
              <span className="text-muted-foreground">同类任务失败重试次数</span>
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
              <span className="text-muted-foreground">单次任务 Token 硬上限</span>
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
          <p className="text-xs text-muted-foreground">
            用户可在“用户管理”中单独覆盖并发上限；重试次数和单次任务 Token
            上限为全平台统一策略。
          </p>
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
                    ? {
                        ...prev,
                        enableCodeGeneration: event.target.checked,
                      }
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
                    ? {
                        ...prev,
                        enableThesisGeneration: event.target.checked,
                      }
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
                    ? {
                        ...prev,
                        enablePreviewBuild: event.target.checked,
                      }
                    : prev
                )
              }
            />
            启用预览构建
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
