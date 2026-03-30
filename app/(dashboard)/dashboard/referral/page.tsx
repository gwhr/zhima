"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, CheckCircle2 } from "lucide-react";

interface ReferralInfo {
  id: string;
  code: string;
  usedCount: number;
  rewardTotal: number;
  createdAt: string;
  inviteUrl: string;
}

export default function ReferralPage() {
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReferral();
  }, []);

  async function fetchReferral() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/referral");
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "获取推广链接失败");
        return;
      }
      setReferral(data.data);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function regenerateCode() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/referral?regenerate=1", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "生成推广链接失败");
        return;
      }
      setReferral(data.data);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setCreating(false);
    }
  }

  async function copyText(value: string, type: "code" | "link") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">邀请推广</h1>
          <p className="text-muted-foreground mt-1">复制推广链接分享给同学，注册时将自动带入邀请码</p>
        </div>
        <Button onClick={regenerateCode} disabled={creating || loading}>
          <Share2 className="mr-2 h-4 w-4" />
          {creating ? "生成中..." : "重新生成链接"}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <p className="text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" onClick={fetchReferral}>
              重新加载
            </Button>
          </CardContent>
        </Card>
      ) : !referral ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">暂未生成推广链接</p>
            <Button onClick={regenerateCode} disabled={creating}>
              立即生成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>我的推广链接</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">邀请码</p>
              <div className="flex items-center gap-2">
                <Input value={referral.code} readOnly className="w-48 font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyText(referral.code, "code")}>
                  {copied === "code" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">推广链接</p>
              <div className="flex items-center gap-2">
                <Input value={referral.inviteUrl} readOnly className="text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyText(referral.inviteUrl, "link")}>
                  {copied === "link" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>已使用: {referral.usedCount} 次</span>
              <span>累计奖励: ¥{Number(referral.rewardTotal).toFixed(2)}</span>
              <span>创建时间: {new Date(referral.createdAt).toLocaleDateString("zh-CN")}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
