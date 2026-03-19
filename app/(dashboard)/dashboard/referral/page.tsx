"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, CheckCircle2 } from "lucide-react";

interface InviteCode {
  id: string;
  code: string;
  usedCount: number;
  rewardTotal: number;
  createdAt: string;
}

export default function ReferralPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCodes(data.data);
      });
  }, []);

  async function createCode() {
    setCreating(true);
    const res = await fetch("/api/referral", { method: "POST" });
    const data = await res.json();
    if (data.success) setCodes((prev) => [data.data, ...prev]);
    setCreating(false);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/register?ref=${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">邀请好友</h1>
          <p className="text-muted-foreground mt-1">分享邀请链接，好友注册后双方均可获得奖励</p>
        </div>
        <Button onClick={createCode} disabled={creating}>
          <Share2 className="mr-2 h-4 w-4" />
          {creating ? "生成中..." : "生成邀请码"}
        </Button>
      </div>

      {codes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <p className="text-muted-foreground mb-4">还没有邀请码</p>
            <Button onClick={createCode} disabled={creating}>
              生成第一个邀请码
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {codes.map((code) => (
            <Card key={code.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Input value={code.code} readOnly className="w-48 font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={() => copyCode(code.code)}>
                      {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>已使用: {code.usedCount} 次</span>
                    <span>奖励: ¥{Number(code.rewardTotal).toFixed(2)}</span>
                    <span>创建: {new Date(code.createdAt).toLocaleDateString("zh-CN")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
