"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ImagePlus, X } from "lucide-react";

type FeedbackItem = {
  id: string;
  content: string;
  contact: string | null;
  pagePath: string | null;
  imageKeys: string[];
  imageUrls: string[];
  status: "OPEN" | "RESOLVED";
  adminNote: string | null;
  createdAt: string;
};

type LocalImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type ApiResult = {
  success?: boolean;
  data?: unknown;
  error?: string;
} | null;

const MAX_IMAGE_COUNT = 3;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

async function parseApiResult(response: Response): Promise<ApiResult> {
  const rawText = await response.text();
  if (!rawText) return null;
  try {
    return JSON.parse(rawText) as ApiResult;
  } catch {
    return null;
  }
}

export default function FeedbackPage() {
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [images, setImages] = useState<LocalImage[]>([]);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadFeedbacks(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/feedback?${params.toString()}`);
      const data = await parseApiResult(res);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "加载反馈记录失败，请刷新重试");
      }

      const payload =
        data && typeof data.data === "object" && data.data !== null
          ? (data.data as {
              items?: unknown;
              total?: unknown;
              page?: unknown;
              totalPages?: unknown;
            })
          : {};
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setTotal(typeof payload.total === "number" ? payload.total : 0);
      setPage(typeof payload.page === "number" ? payload.page : nextPage);
      setTotalPages(
        typeof payload.totalPages === "number" && payload.totalPages > 0
          ? payload.totalPages
          : 1
      );
      setError(null);
    } catch (loadError) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "加载反馈记录失败，请稍后重试"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeedbacks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      for (const image of images) {
        URL.revokeObjectURL(image.previewUrl);
      }
    };
  }, [images]);

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }

  function handleImagePick(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    event.target.value = "";
    if (!fileList || fileList.length === 0) return;

    const nextFiles = Array.from(fileList);
    const left = MAX_IMAGE_COUNT - images.length;
    if (left <= 0) {
      setError(`最多上传 ${MAX_IMAGE_COUNT} 张图片`);
      return;
    }

    const accepted: LocalImage[] = [];
    for (const file of nextFiles.slice(0, left)) {
      if (!file.type.startsWith("image/")) {
        setError("仅支持图片文件");
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError("单张图片不能超过 2MB");
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (accepted.length > 0) {
      setImages((prev) => [...prev, ...accepted]);
      setError(null);
    }
  }

  async function uploadImages(): Promise<string[]> {
    const keys: string[] = [];
    for (const image of images) {
      const formData = new FormData();
      formData.append("file", image.file);
      const res = await fetch("/api/feedback/upload", {
        method: "POST",
        body: formData,
      });
      const data = await parseApiResult(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "图片上传失败，请稍后重试");
      }
      const key =
        typeof (data.data as { key?: unknown } | undefined)?.key === "string"
          ? (data.data as { key: string }).key
          : "";
      if (!key) {
        throw new Error("图片上传失败，请重试");
      }
      keys.push(key);
    }
    return keys;
  }

  async function submitFeedback(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const text = content.trim();
    if (text.length < 5) {
      setError("反馈内容至少 5 个字符");
      return;
    }

    setSubmitting(true);
    try {
      const imageKeys = await uploadImages();
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          contact: contact.trim(),
          pagePath: window.location.pathname,
          imageKeys,
        }),
      });
      const data = await parseApiResult(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "提交失败，请稍后重试");
      }

      setContent("");
      setContact("");
      for (const image of images) URL.revokeObjectURL(image.previewUrl);
      setImages([]);
      setMessage("反馈已提交，感谢你的建议");
      await loadFeedbacks(1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <Card className="border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
        <CardHeader>
          <CardTitle>用户反馈</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submitFeedback}>
            <Textarea
              placeholder="欢迎告诉我们你遇到的问题或建议（支持文字 + 图片）"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              maxLength={3000}
              disabled={submitting}
            />
            <Input
              placeholder="联系方式（可选，邮箱/微信/手机号）"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              maxLength={100}
              disabled={submitting}
            />
            <div className="space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
                <ImagePlus className="h-4 w-4" />
                添加图片
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImagePick}
                  disabled={submitting || images.length >= MAX_IMAGE_COUNT}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                最多 {MAX_IMAGE_COUNT} 张，单张不超过 2MB
              </p>
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {images.map((image) => (
                    <div key={image.id} className="relative overflow-hidden rounded-lg border bg-muted/20">
                      <img
                        src={image.previewUrl}
                        alt="feedback-upload"
                        className="h-28 w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                        onClick={() => removeImage(image.id)}
                        disabled={submitting}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {message && <p className="text-sm text-emerald-600">{message}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                "提交反馈"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
        <CardHeader>
          <CardTitle>我的反馈记录（共 {total} 条）</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无反馈记录</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-xl border bg-muted/20 p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge variant={item.status === "OPEN" ? "secondary" : "default"}>
                        {item.status === "OPEN" ? "待处理" : "已处理"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{item.content}</p>
                    {item.imageUrls.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                        {item.imageUrls.map((url, index) => (
                          <a key={`${item.id}-image-${index}`} href={url} target="_blank" rel="noreferrer">
                            <img
                              src={url}
                              alt={`feedback-${index + 1}`}
                              className="h-24 w-full rounded-md border object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {item.adminNote && (
                      <div className="mt-3 rounded-md border border-cyan-200 bg-cyan-50 p-2 text-sm text-cyan-800">
                        管理员回复：{item.adminNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || page <= 1}
                    onClick={() => void loadFeedbacks(page - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    第 {page} / {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || page >= totalPages}
                    onClick={() => void loadFeedbacks(page + 1)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
