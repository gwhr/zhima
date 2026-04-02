"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TokenSummary = {
  tokenBudget: number;
  tokenUsed: number;
  tokenRemaining: number;
  tokenFrozen: number;
  dailyUsedPoints: number;
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens: number;
};

type PlanItem = {
  id: string;
  name: string;
  price: number;
  priceYuan: number;
  points: number;
  description: string;
};

type LedgerItem = {
  id: string;
  type: string;
  taskType: string | null;
  model: string | null;
  billedPoints: number;
  deltaAvailablePoints: number;
  deltaFrozenPoints: number;
  deltaUsedPoints: number;
  availableAfter: number;
  frozenAfter: number;
  usedAfter: number;
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens: number;
  costYuan: number;
  billingMultiplier: number;
  pointRate: number;
  description: string | null;
  createdAt: string;
};

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [tokenSummary, setTokenSummary] = useState<TokenSummary | null>(null);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setMessage(null);

    const parseJsonSafe = async (response: Response) => {
      try {
        return await response.json();
      } catch {
        return null;
      }
    };

    try {
      const [tokenResResult, plansResResult, ledgerResResult] = await Promise.allSettled([
        fetch("/api/billing/tokens"),
        fetch("/api/billing/plans"),
        fetch("/api/billing/ledger?limit=50"),
      ]);

      const failedSections: string[] = [];

      if (tokenResResult.status === "fulfilled") {
        const tokenData = await parseJsonSafe(tokenResResult.value);
        if (tokenResResult.value.ok && tokenData?.success) {
          setTokenSummary((tokenData.data as TokenSummary) ?? null);
        } else {
          setTokenSummary(null);
          failedSections.push("余额");
        }
      } else {
        setTokenSummary(null);
        failedSections.push("余额");
      }

      if (plansResResult.status === "fulfilled") {
        const plansData = await parseJsonSafe(plansResResult.value);
        if (plansResResult.value.ok && plansData?.success) {
          setPlans(toArray<PlanItem>(plansData.data));
        } else {
          setPlans([]);
          failedSections.push("充值包");
        }
      } else {
        setPlans([]);
        failedSections.push("充值包");
      }

      if (ledgerResResult.status === "fulfilled") {
        const ledgerData = await parseJsonSafe(ledgerResResult.value);
        if (ledgerResResult.value.ok && ledgerData?.success) {
          setLedger(toArray<LedgerItem>(ledgerData.data));
        } else {
          setLedger([]);
          failedSections.push("账单流水");
        }
      } else {
        setLedger([]);
        failedSections.push("账单流水");
      }

      if (failedSections.length > 0) {
        setMessage(`部分数据加载失败（${failedSections.join("、")}），请稍后刷新重试`);
      }
    } catch {
      setMessage("加载账单数据失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const usageRatio = useMemo(() => {
    if (!tokenSummary || tokenSummary.tokenBudget <= 0) return 0;
    return Math.min(100, Math.round((tokenSummary.tokenUsed / tokenSummary.tokenBudget) * 100));
  }, [tokenSummary]);

  async function createPayment(planId: string) {
    setPayingPlanId(planId);
    setMessage(null);
    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: planId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "创建订单失败");
      }

      const paymentUrl = String(result.data?.paymentUrl || "");
      if (!paymentUrl) {
        throw new Error("支付地址为空，请先检查支付配置");
      }

      window.open(paymentUrl, "_blank", "noopener,noreferrer");
      setMessage("支付窗口已打开，支付完成后刷新本页即可查看余额变更");
    } catch (paymentError) {
      setMessage(paymentError instanceof Error ? paymentError.message : "创建订单失败");
    } finally {
      setPayingPlanId(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Token 余额与充值</h1>
        <p className="mt-1 text-muted-foreground">
          用户购买的是平台点数，任务按真实模型消耗折算扣点，支持多模型统一计费。
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中...
        </div>
      )}

      {tokenSummary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>我的余额</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <p className="text-xs text-muted-foreground">总点数</p>
                <p className="text-xl font-semibold">{tokenSummary.tokenBudget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">可用</p>
                <p className="text-xl font-semibold text-emerald-600">
                  {tokenSummary.tokenRemaining.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">冻结</p>
                <p className="text-xl font-semibold text-amber-600">
                  {tokenSummary.tokenFrozen.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">已用</p>
                <p className="text-xl font-semibold">{tokenSummary.tokenUsed.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">今日已扣</p>
                <p className="text-xl font-semibold">
                  {tokenSummary.dailyUsedPoints.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${usageRatio}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                使用进度：{usageRatio}% · Token（输入/输出/缓存）：
                {` ${tokenSummary.inputTokens.toLocaleString()} / ${tokenSummary.outputTokens.toLocaleString()} / ${tokenSummary.cacheHitTokens.toLocaleString()}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Token 充值包</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{plan.id}</p>
              <h3 className="mt-1 text-lg font-semibold">{plan.name}</h3>
              <p className="mt-2 text-2xl font-bold">¥ {plan.priceYuan.toFixed(2)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{plan.points.toLocaleString()} 点</p>
              <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
              <Button
                className="mt-4 w-full"
                onClick={() => void createPayment(plan.id)}
                disabled={payingPlanId !== null}
              >
                {payingPlanId === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "立即充值"
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>扣费流水</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-2 py-3 text-left font-medium">时间</th>
                  <th className="px-2 py-3 text-left font-medium">类型</th>
                  <th className="px-2 py-3 text-left font-medium">任务/模型</th>
                  <th className="px-2 py-3 text-left font-medium">Token（入/出/缓存）</th>
                  <th className="px-2 py-3 text-left font-medium">点数变动</th>
                  <th className="px-2 py-3 text-left font-medium">变动后状态</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-2 py-3 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-2 py-3">{item.type}</td>
                    <td className="px-2 py-3">
                      <p>{item.taskType || "-"}</p>
                      <p className="font-mono text-xs text-muted-foreground">{item.model || "-"}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </td>
                    <td className="px-2 py-3 tabular-nums">
                      {item.inputTokens.toLocaleString()} / {item.outputTokens.toLocaleString()} /{" "}
                      {item.cacheHitTokens.toLocaleString()}
                      <p className="text-xs text-muted-foreground">
                        ¥ {Number(item.costYuan || 0).toFixed(6)}
                      </p>
                    </td>
                    <td className="px-2 py-3 tabular-nums">
                      <p>可用 {formatDelta(item.deltaAvailablePoints)}</p>
                      <p>冻结 {formatDelta(item.deltaFrozenPoints)}</p>
                      <p>已用 {formatDelta(item.deltaUsedPoints)}</p>
                      <p className="text-xs text-muted-foreground">
                        计费点数 {item.billedPoints.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-2 py-3 tabular-nums">
                      <p>可用 {item.availableAfter.toLocaleString()}</p>
                      <p>冻结 {item.frozenAfter.toLocaleString()}</p>
                      <p>已用 {item.usedAfter.toLocaleString()}</p>
                    </td>
                  </tr>
                ))}
                {ledger.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground">
                      暂无流水
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
