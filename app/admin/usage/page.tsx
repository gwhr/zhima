"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface UsageData {
  periodDays: number;
  summary: {
    period: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      costYuan: number;
      logCount: number;
    };
    allTime: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      costYuan: number;
      logCount: number;
    };
  };
  byModel: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costYuan: number;
  }>;
  byTaskType: Array<{
    taskType: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costYuan: number;
  }>;
  byUser: Array<{
    userId: string;
    user: { name: string | null; email: string | null; phone: string | null } | null;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costYuan: number;
  }>;
  daily: Array<{
    date: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costYuan: number;
  }>;
}

export default function AdminUsagePage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUsage(nextDays: number) {
    setLoading(true);
    const response = await fetch(`/api/admin/usage?days=${nextDays}`);
    const result = await response.json();
    if (result.success) {
      setData(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetchUsage(days);
  }, [days]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Token / AI 用量</h1>
        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value={7}>最近 7 天</option>
          <option value={30}>最近 30 天</option>
          <option value={60}>最近 60 天</option>
          <option value={90}>最近 90 天</option>
        </select>
      </div>

      {loading || !data ? (
        <div className="py-8 flex items-center justify-center text-muted-foreground text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {data.periodDays} 天 Token
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">
                {data.summary.period.totalTokens.toLocaleString()}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {data.periodDays} 天 AI 成本
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">
                ¥ {data.summary.period.costYuan.toFixed(4)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">全量 Token</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">
                {data.summary.allTime.totalTokens.toLocaleString()}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">全量 AI 成本</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">
                ¥ {data.summary.allTime.costYuan.toFixed(4)}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">模型消耗排行</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-1 font-medium">模型</th>
                      <th className="text-right py-2 px-1 font-medium">Token</th>
                      <th className="text-right py-2 px-1 font-medium">成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byModel.map((item) => (
                      <tr key={item.model} className="border-b last:border-0">
                        <td className="py-2 px-1 font-mono text-xs">{item.model}</td>
                        <td className="py-2 px-1 text-right tabular-nums">
                          {item.totalTokens.toLocaleString()}
                        </td>
                        <td className="py-2 px-1 text-right tabular-nums">
                          ¥ {item.costYuan.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">任务类型消耗排行</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-1 font-medium">任务类型</th>
                      <th className="text-right py-2 px-1 font-medium">Token</th>
                      <th className="text-right py-2 px-1 font-medium">成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byTaskType.map((item) => (
                      <tr key={item.taskType} className="border-b last:border-0">
                        <td className="py-2 px-1">{item.taskType}</td>
                        <td className="py-2 px-1 text-right tabular-nums">
                          {item.totalTokens.toLocaleString()}
                        </td>
                        <td className="py-2 px-1 text-right tabular-nums">
                          ¥ {item.costYuan.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">用户消耗 Top 20</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-1 font-medium">用户</th>
                      <th className="text-right py-2 px-1 font-medium">Token</th>
                      <th className="text-right py-2 px-1 font-medium">成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byUser.map((item) => (
                      <tr key={item.userId} className="border-b last:border-0">
                        <td className="py-2 px-1">
                          {item.user?.name || item.user?.email || item.user?.phone || item.userId}
                        </td>
                        <td className="py-2 px-1 text-right tabular-nums">
                          {item.totalTokens.toLocaleString()}
                        </td>
                        <td className="py-2 px-1 text-right tabular-nums">
                          ¥ {item.costYuan.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">每日消耗趋势</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-1 font-medium">日期</th>
                      <th className="text-right py-2 px-1 font-medium">Token</th>
                      <th className="text-right py-2 px-1 font-medium">成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((item) => (
                      <tr key={item.date} className="border-b last:border-0">
                        <td className="py-2 px-1">{item.date}</td>
                        <td className="py-2 px-1 text-right tabular-nums">
                          {item.totalTokens.toLocaleString()}
                        </td>
                        <td className="py-2 px-1 text-right tabular-nums">
                          ¥ {item.costYuan.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
