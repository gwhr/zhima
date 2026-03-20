"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  priceYuan: number;
  features: string[];
  description: string;
}

interface TokenSummary {
  tokenBudget: number;
  tokenUsed: number;
  tokenRemaining: number;
  inputTokens: number;
  outputTokens: number;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tokenSummary, setTokenSummary] = useState<TokenSummary | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/billing/plans"), fetch("/api/billing/tokens")])
      .then(async ([plansRes, tokensRes]) => {
        const [plansData, tokensData] = await Promise.all([
          plansRes.json(),
          tokensRes.json(),
        ]);
        if (plansData.success) setPlans(plansData.data);
        if (tokensData.success) setTokenSummary(tokensData.data);
      })
      .catch(() => {
        // ignore dashboard data error
      });
  }, []);

  async function handlePurchase(planId: string) {
    const res = await fetch("/api/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planType: planId }),
    });
    const data = await res.json();
    if (data.success && data.data.paymentUrl) {
      window.open(data.data.paymentUrl, "_blank");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">套餐管理</h1>
        <p className="text-muted-foreground mt-1">选择适合你的套餐方案</p>
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

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={plan.id === "STANDARD" ? "border-primary shadow-lg relative" : ""}>
            {plan.id === "STANDARD" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                推荐
              </div>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle>{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">¥{plan.priceYuan}</span>
                <span className="text-muted-foreground"> /项目</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.id === "STANDARD" ? "default" : "outline"}
                onClick={() => handlePurchase(plan.id)}
              >
                购买套餐
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
