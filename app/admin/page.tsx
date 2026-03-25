"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreditCard,
  DollarSign,
  FolderOpen,
  Loader2,
  TriangleAlert,
  Users,
} from "lucide-react";

interface Stats {
  userCount: number;
  newUserCountToday: number;
  workspaceCount: number;
  newWorkspaceCountToday: number;
  orderCount: number;
  revenue: number;
  runningTaskCount: number;
  failedTaskCountToday: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载中...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-sm text-destructive">
        统计信息加载失败，请刷新重试。
      </div>
    );
  }

  const cards = [
    {
      label: "总用户数",
      value: stats.userCount.toLocaleString(),
      extra: `今日新增 ${stats.newUserCountToday}`,
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "工作空间",
      value: stats.workspaceCount.toLocaleString(),
      extra: `今日新增 ${stats.newWorkspaceCountToday}`,
      icon: FolderOpen,
      color: "text-green-600",
    },
    {
      label: "已支付订单",
      value: stats.orderCount.toLocaleString(),
      extra: "累计支付成功订单",
      icon: CreditCard,
      color: "text-purple-600",
    },
    {
      label: "累计收入",
      value: `¥ ${stats.revenue.toFixed(2)}`,
      extra: "已支付订单金额合计",
      icon: DollarSign,
      color: "text-orange-600",
    },
    {
      label: "运行中任务",
      value: stats.runningTaskCount.toLocaleString(),
      extra: "PENDING / RUNNING",
      icon: Loader2,
      color: "text-sky-600",
    },
    {
      label: "今日失败任务",
      value: stats.failedTaskCountToday.toLocaleString(),
      extra: "需要排查与重试",
      icon: TriangleAlert,
      color: "text-red-600",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理员看板</h1>
        <p className="text-sm text-muted-foreground mt-1">
          平台核心状态总览（用户、任务、订单与收入）
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.extra}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
