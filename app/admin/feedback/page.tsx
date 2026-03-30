"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search } from "lucide-react";

type FeedbackItem = {
  id: string;
  userId: string;
  content: string;
  contact: string | null;
  pagePath: string | null;
  imageKeys: string[];
  imageUrls: string[];
  status: "OPEN" | "RESOLVED";
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
};

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load(nextPage = page, nextKeyword = keyword, nextStatus = status) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (nextKeyword.trim()) params.set("keyword", nextKeyword.trim());
    if (nextStatus !== "ALL") params.set("status", nextStatus);

    const res = await fetch(`/api/admin/feedback?${params}`);
    const data = await res.json();
    if (data.success) {
      setItems(data.data.items);
      setTotal(data.data.total);
      setPage(data.data.page);
      const nextNotes: Record<string, string> = {};
      for (const row of data.data.items as FeedbackItem[]) {
        nextNotes[row.id] = row.adminNote ?? "";
      }
      setNotes(nextNotes);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load(1, "", "ALL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveStatus(item: FeedbackItem, nextStatus: "OPEN" | "RESOLVED") {
    setSavingId(item.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status: nextStatus,
          adminNote: notes[item.id] ?? "",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "保存失败");
      }
      setMessage("反馈状态已更新");
      await load(page, keyword, status);
    } catch (updateError) {
      setMessage(updateError instanceof Error ? updateError.message : "保存失败");
    } finally {
      setSavingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">用户反馈</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => {
              const next = event.target.value as "ALL" | "OPEN" | "RESOLVED";
              setStatus(next);
              void load(1, keyword, next);
            }}
          >
            <option value="ALL">全部状态</option>
            <option value="OPEN">待处理</option>
            <option value="RESOLVED">已处理</option>
          </select>
          <Input
            className="w-72"
            placeholder="搜索内容/联系方式/用户"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void load(1, keyword, status);
              }
            }}
          />
          <Button variant="outline" size="icon" onClick={() => void load(1, keyword, status)}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Card>
        <CardHeader>
          <CardTitle>共 {total} 条反馈</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无反馈</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={item.status === "OPEN" ? "secondary" : "default"}>
                        {item.status === "OPEN" ? "待处理" : "已处理"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        用户：{item.user.name || "-"} / {item.user.email || item.user.phone || "-"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm">{item.content}</p>
                  {item.contact && (
                    <p className="mt-2 text-xs text-muted-foreground">联系方式：{item.contact}</p>
                  )}
                  {item.pagePath && (
                    <p className="mt-1 text-xs text-muted-foreground">来源页面：{item.pagePath}</p>
                  )}

                  {item.imageUrls.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                      {item.imageUrls.map((url, index) => (
                        <a key={`${item.id}-img-${index}`} href={url} target="_blank" rel="noreferrer">
                          <img
                            src={url}
                            alt={`feedback-${index + 1}`}
                            className="h-24 w-full rounded-md border object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="管理员备注（可选）"
                      value={notes[item.id] ?? ""}
                      onChange={(event) =>
                        setNotes((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      rows={3}
                      maxLength={2000}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={item.status === "OPEN" ? "default" : "outline"}
                        disabled={savingId === item.id}
                        onClick={() => void saveStatus(item, "RESOLVED")}
                      >
                        {savingId === item.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            保存中...
                          </>
                        ) : (
                          "标记已处理"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={savingId === item.id}
                        onClick={() => void saveStatus(item, "OPEN")}
                      >
                        标记待处理
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => void load(page - 1, keyword, status)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => void load(page + 1, keyword, status)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
