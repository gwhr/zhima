"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface TemplateItem {
  id: string;
  name: string;
  version: string | null;
  path: string;
  size: number;
  isActive: boolean;
  note: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [note, setNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadTemplates() {
    setLoading(true);
    const response = await fetch("/api/admin/templates");
    const result = await response.json();
    if (result.success) {
      setTemplates(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function uploadTemplate(file: File) {
    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("version", version);
      formData.append("note", note);
      formData.append("activate", "true");

      const response = await fetch("/api/admin/templates", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "上传失败");
      }

      setMessage("模板上传成功，并已设为平台启用模板。");
      await loadTemplates();
    } catch (uploadError) {
      setMessage(uploadError instanceof Error ? uploadError.message : "上传失败");
    } finally {
      setSaving(false);
    }
  }

  async function activateTemplate(templateId: string) {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "启用失败");
      }
      setMessage("模板已切换。后续论文将统一使用该模板。");
      await loadTemplates();
    } catch (activateError) {
      setMessage(activateError instanceof Error ? activateError.message : "启用失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(templateId: string) {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "删除失败");
      }
      setMessage("模板已删除。");
      await loadTemplates();
    } catch (deleteError) {
      setMessage(deleteError instanceof Error ? deleteError.message : "删除失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">论文模板管理</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">上传新模板（平台统一使用）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="模板名称（例如：学校标准模板）"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              placeholder="版本号（例如：v1.0）"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
            />
          </div>
          <Textarea
            placeholder="备注（可选）"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-[80px]"
          />

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) {
                void uploadTemplate(selected);
              }
              event.currentTarget.value = "";
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            上传并启用
          </Button>
          <p className="text-xs text-muted-foreground">
            模板上传后将由平台统一使用，普通用户工作空间不再开放模板上传。
          </p>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">模板列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">名称</th>
                    <th className="text-left py-3 px-2 font-medium">版本</th>
                    <th className="text-left py-3 px-2 font-medium">大小</th>
                    <th className="text-left py-3 px-2 font-medium">状态</th>
                    <th className="text-left py-3 px-2 font-medium">上传时间</th>
                    <th className="text-left py-3 px-2 font-medium">上传人</th>
                    <th className="text-left py-3 px-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{template.path}</p>
                      </td>
                      <td className="py-3 px-2">{template.version || "-"}</td>
                      <td className="py-3 px-2">{(template.size / 1024).toFixed(1)} KB</td>
                      <td className="py-3 px-2">
                        {template.isActive ? (
                          <Badge>启用中</Badge>
                        ) : (
                          <Badge variant="outline">未启用</Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {new Date(template.createdAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="py-3 px-2">
                        {template.createdBy?.name ||
                          template.createdBy?.email ||
                          template.createdBy?.phone ||
                          "-"}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving || template.isActive}
                            onClick={() => void activateTemplate(template.id)}
                          >
                            设为启用
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving || template.isActive}
                            onClick={() => void deleteTemplate(template.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
