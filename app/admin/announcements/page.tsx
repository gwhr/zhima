"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  level: "INFO" | "WARNING" | "MAINTENANCE";
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

const levelLabel: Record<AnnouncementItem["level"], string> = {
  INFO: "普通通知",
  WARNING: "风险提醒",
  MAINTENANCE: "维护公告",
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [level, setLevel] = useState<AnnouncementItem["level"]>("INFO");
  const [message, setMessage] = useState<string | null>(null);

  async function loadAnnouncements() {
    setLoading(true);
    const response = await fetch("/api/admin/announcements?limit=50");
    const result = await response.json();
    if (result.success) {
      setItems(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  async function publish() {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, level }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "发布失败");
      }

      setTitle("");
      setContent("");
      setLevel("INFO");
      setMessage(`已发布，覆盖 ${result.data.targetCount} 位用户`);
      await loadAnnouncements();
    } catch (publishError) {
      setMessage(publishError instanceof Error ? publishError.message : "发布失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">系统通知 / 公告</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">发布公告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="公告标题"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            className="min-h-[120px]"
            placeholder="公告内容"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <div className="flex items-center gap-2">
            <select
              value={level}
              onChange={(event) =>
                setLevel(event.target.value as AnnouncementItem["level"])
              }
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="INFO">普通通知</option>
              <option value="WARNING">风险提醒</option>
              <option value="MAINTENANCE">维护公告</option>
            </select>
            <Button
              onClick={() => void publish()}
              disabled={submitting || !title.trim() || !content.trim()}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              立即发布
            </Button>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">最近公告</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <Badge variant="outline">{levelLabel[item.level]}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {item.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    发布人：
                    {item.createdBy?.name ||
                      item.createdBy?.email ||
                      item.createdBy?.phone ||
                      "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
