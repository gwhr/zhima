"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, CreditCard, DollarSign } from "lucide-react";

interface Stats {
  userCount: number;
  workspaceCount: number;
  orderCount: number;
  revenue: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      });
  }, []);

  const cards = stats
    ? [
        { label: "用户总数", value: stats.userCount, icon: Users, color: "text-blue-600" },
        { label: "工作空间", value: stats.workspaceCount, icon: FolderOpen, color: "text-green-600" },
        { label: "订单数量", value: stats.orderCount, icon: CreditCard, color: "text-purple-600" },
        { label: "总收入 (¥)", value: stats.revenue.toFixed(2), icon: DollarSign, color: "text-orange-600" },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">管理后台</h1>

      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">加载中...</p>
      )}
    </div>
  );
}
