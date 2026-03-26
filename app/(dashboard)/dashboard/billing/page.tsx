"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TokenSummary {
  tokenBudget: number;
  tokenUsed: number;
  tokenRemaining: number;
  inputTokens: number;
  outputTokens: number;
}

export default function BillingPage() {
  const [tokenSummary, setTokenSummary] = useState<TokenSummary | null>(null);

  useEffect(() => {
    fetch("/api/billing/tokens")
      .then(async (tokensRes) => {
        const tokensData = await tokensRes.json();
        if (tokensData.success) setTokenSummary(tokensData.data);
      })
      .catch(() => {
        // ignore dashboard data error
      });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Token 配额</h1>
        <p className="text-muted-foreground mt-1">当前版本仅开放免费额度控制，暂不开放在线付费购买</p>
      </div>

      {tokenSummary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Token 配额</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">总额度</p>
              <p className="text-xl font-semibold">
                {tokenSummary.tokenBudget.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">已使用</p>
              <p className="text-xl font-semibold">
                {tokenSummary.tokenUsed.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">剩余</p>
              <p className="text-xl font-semibold text-green-600">
                {tokenSummary.tokenRemaining.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">输入/输出</p>
              <p className="text-sm">
                {tokenSummary.inputTokens.toLocaleString()} /{" "}
                {tokenSummary.outputTokens.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. 一期上线阶段先由平台统一承担模型成本，按用户 token 总额度进行限制。</p>
          <p>2. 你可以继续使用代码生成、论文生成、预览和下载功能。</p>
          <p>3. 正式备案和支付合规完成后，再开放按 token 计费与充值能力。</p>
          <Button variant="outline" asChild>
            <Link href="/workspace">去工作空间继续生成</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
