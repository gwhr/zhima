"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderItem {
  id: string;
  planType: string;
  amount: number;
  status: string;
  tradeNo: string | null;
  createdAt: string;
  paidAt: string | null;
  user: { name: string | null; email: string | null };
}

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "待支付", variant: "secondary" },
  PAID: { label: "已支付", variant: "default" },
  REFUNDED: { label: "已退款", variant: "destructive" },
  EXPIRED: { label: "已过期", variant: "outline" },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((response) => response.json())
      .then((result) => {
        if (result.success) setOrders(result.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载订单...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">充值订单</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">共 {orders.length} 条订单</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-2 py-3 text-left font-medium">订单号</th>
                  <th className="px-2 py-3 text-left font-medium">用户</th>
                  <th className="px-2 py-3 text-left font-medium">充值包</th>
                  <th className="px-2 py-3 text-left font-medium">金额</th>
                  <th className="px-2 py-3 text-left font-medium">状态</th>
                  <th className="px-2 py-3 text-left font-medium">支付流水号</th>
                  <th className="px-2 py-3 text-left font-medium">创建时间</th>
                  <th className="px-2 py-3 text-left font-medium">支付时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const status = statusLabels[order.status] || statusLabels.PENDING;
                  return (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-2 py-3 font-mono text-xs">{order.id}</td>
                      <td className="px-2 py-3">
                        {order.user.name || order.user.email || "-"}
                      </td>
                      <td className="px-2 py-3">{order.planType}</td>
                      <td className="px-2 py-3 font-medium">
                        ¥ {(Number(order.amount) / 100).toFixed(2)}
                      </td>
                      <td className="px-2 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-2 py-3 font-mono text-xs text-muted-foreground">
                        {order.tradeNo || "-"}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {order.paidAt ? new Date(order.paidAt).toLocaleString("zh-CN") : "-"}
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
