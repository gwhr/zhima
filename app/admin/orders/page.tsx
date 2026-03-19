"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OrderItem {
  id: string;
  userId: string;
  planType: string;
  amount: number;
  status: string;
  tradeNo: string | null;
  createdAt: string;
  paidAt: string | null;
  user: { name: string | null; email: string | null };
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "待支付", variant: "secondary" },
  PAID: { label: "已支付", variant: "default" },
  REFUNDED: { label: "已退款", variant: "destructive" },
  EXPIRED: { label: "已过期", variant: "outline" },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setOrders(data.data);
      });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">订单管理</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">共 {orders.length} 条订单</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">订单号</th>
                  <th className="text-left py-3 px-2 font-medium">用户</th>
                  <th className="text-left py-3 px-2 font-medium">套餐</th>
                  <th className="text-left py-3 px-2 font-medium">金额</th>
                  <th className="text-left py-3 px-2 font-medium">状态</th>
                  <th className="text-left py-3 px-2 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const st = statusLabels[o.status] || statusLabels.PENDING;
                  return (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-xs">{o.id.slice(0, 12)}...</td>
                      <td className="py-3 px-2">{o.user.name || o.user.email || "-"}</td>
                      <td className="py-3 px-2">{o.planType}</td>
                      <td className="py-3 px-2 font-medium">¥{Number(o.amount).toFixed(2)}</td>
                      <td className="py-3 px-2">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {new Date(o.createdAt).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
