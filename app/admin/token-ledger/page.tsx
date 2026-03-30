"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LedgerType =
  | "INIT_GRANT"
  | "RECHARGE"
  | "FREEZE"
  | "SETTLE"
  | "REFUND"
  | "MANUAL_ADJUST"
  | "ROLLBACK";

type LedgerRow = {
  id: string;
  userId: string;
  reservationId: string | null;
  taskJobId: string | null;
  type: LedgerType;
  deltaAvailablePoints: number;
  deltaFrozenPoints: number;
  deltaUsedPoints: number;
  availableAfter: number;
  frozenAfter: number;
  usedAfter: number;
  billedPoints: number;
  pointRate: number;
  model: string | null;
  taskType: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens: number;
  costYuan: number;
  description: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  reservation: {
    id: string;
    status: "ACTIVE" | "SETTLED" | "RELEASED";
    source: string;
    reservedPoints: number;
    settledPoints: number;
    taskJobId: string | null;
  } | null;
};

const typeOptions: Array<{ label: string; value: string }> = [
  { label: "全部", value: "" },
  { label: "初始化", value: "INIT_GRANT" },
  { label: "充值", value: "RECHARGE" },
  { label: "冻结", value: "FREEZE" },
  { label: "结算", value: "SETTLE" },
  { label: "回退", value: "REFUND" },
  { label: "手动调整", value: "MANUAL_ADJUST" },
  { label: "异常回滚", value: "ROLLBACK" },
];

export default function AdminTokenLedgerPage() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [rollingId, setRollingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function loadData(nextPage = page, nextType = type, nextUserId = userId) {
    setLoading(true);
    setMessage(null);
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (nextType) params.set("type", nextType);
    if (nextUserId.trim()) params.set("userId", nextUserId.trim());

    const response = await fetch(`/api/admin/token-ledger?${params.toString()}`);
    const result = await response.json();
    if (result.success) {
      setRows(result.data.rows);
      setTotal(result.data.total);
      setPage(result.data.page);
    } else {
      setMessage(result.error || "加载流水失败");
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadData(1, "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function rollbackReservation(row: LedgerRow) {
    const reservationId = row.reservationId || row.reservation?.id || "";
    if (!reservationId) {
      setMessage("该流水没有关联冻结记录，无法回滚");
      return;
    }

    const confirm = window.confirm(
      `确认回滚冻结记录 ${reservationId} 吗？该操作会释放当前冻结点数。`
    );
    if (!confirm) return;

    setRollingId(row.id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/token-ledger/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId,
          reason: "Admin manual rollback from token ledger page",
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "回滚失败");
      }
      setMessage("冻结额度已回滚");
      await loadData(page);
    } catch (rollbackError) {
      setMessage(rollbackError instanceof Error ? rollbackError.message : "回滚失败");
    } finally {
      setRollingId(null);
    }
  }

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.deltaAvailable += row.deltaAvailablePoints;
        acc.deltaFrozen += row.deltaFrozenPoints;
        acc.deltaUsed += row.deltaUsedPoints;
        acc.billed += row.billedPoints;
        return acc;
      },
      { deltaAvailable: 0, deltaFrozen: 0, deltaUsed: 0, billed: 0 }
    );
  }, [rows]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Token 流水</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">筛选与统计</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">类型</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3"
              >
                {typeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-muted-foreground">用户 ID（可选）</span>
              <Input
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="按用户 ID 精确筛选"
              />
            </label>

            <div className="flex items-end gap-2">
              <Button onClick={() => void loadData(1, type, userId)} disabled={loading}>
                查询
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setType("");
                  setUserId("");
                  void loadData(1, "", "");
                }}
                disabled={loading}
              >
                重置
              </Button>
            </div>
          </div>

          <div className="grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">本页可用余额变动</p>
              <p className="tabular-nums">{summary.deltaAvailable.toLocaleString()}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">本页冻结余额变动</p>
              <p className="tabular-nums">{summary.deltaFrozen.toLocaleString()}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">本页已用余额变动</p>
              <p className="tabular-nums">{summary.deltaUsed.toLocaleString()}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">本页计费点数</p>
              <p className="tabular-nums">{summary.billed.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">流水明细（共 {total} 条）</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-2 py-3 text-left font-medium">时间</th>
                    <th className="px-2 py-3 text-left font-medium">用户</th>
                    <th className="px-2 py-3 text-left font-medium">类型</th>
                    <th className="px-2 py-3 text-left font-medium">任务/模型</th>
                    <th className="px-2 py-3 text-left font-medium">Token（入/出/缓存）</th>
                    <th className="px-2 py-3 text-left font-medium">点数变动</th>
                    <th className="px-2 py-3 text-left font-medium">余额后状态</th>
                    <th className="px-2 py-3 text-left font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const canRollback =
                      row.type === "FREEZE" &&
                      row.reservation?.status === "ACTIVE" &&
                      !!row.reservationId;
                    const userLabel =
                      row.user.name || row.user.email || row.user.phone || row.user.id;

                    return (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-2 py-3 text-xs text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString("zh-CN")}
                        </td>
                        <td className="px-2 py-3">
                          <p>{userLabel}</p>
                          <p className="font-mono text-xs text-muted-foreground">{row.userId}</p>
                        </td>
                        <td className="px-2 py-3">{row.type}</td>
                        <td className="px-2 py-3">
                          <p>{row.taskType || "-"}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {row.model || "-"}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {row.taskJobId || row.reservationId || "-"}
                          </p>
                        </td>
                        <td className="px-2 py-3 tabular-nums">
                          {row.inputTokens.toLocaleString()} /{" "}
                          {row.outputTokens.toLocaleString()} /{" "}
                          {row.cacheHitTokens.toLocaleString()}
                          <p className="text-xs text-muted-foreground">
                            ¥ {Number(row.costYuan || 0).toFixed(6)}
                          </p>
                        </td>
                        <td className="px-2 py-3 tabular-nums">
                          <p>可用 {row.deltaAvailablePoints >= 0 ? "+" : ""}{row.deltaAvailablePoints}</p>
                          <p>冻结 {row.deltaFrozenPoints >= 0 ? "+" : ""}{row.deltaFrozenPoints}</p>
                          <p>已用 {row.deltaUsedPoints >= 0 ? "+" : ""}{row.deltaUsedPoints}</p>
                          <p className="text-xs text-muted-foreground">
                            计费点数 {row.billedPoints}
                          </p>
                        </td>
                        <td className="px-2 py-3 tabular-nums">
                          <p>可用 {row.availableAfter.toLocaleString()}</p>
                          <p>冻结 {row.frozenAfter.toLocaleString()}</p>
                          <p>已用 {row.usedAfter.toLocaleString()}</p>
                        </td>
                        <td className="px-2 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canRollback || rollingId === row.id}
                            onClick={() => void rollbackReservation(row)}
                          >
                            {rollingId === row.id && (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            )}
                            回滚冻结
                          </Button>
                          {!canRollback && row.type === "FREEZE" && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {row.reservation?.status === "ACTIVE"
                                ? "缺少 reservationId"
                                : "该冻结已结算/释放"}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => void loadData(page - 1)}
              >
                上一页
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => void loadData(page + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
