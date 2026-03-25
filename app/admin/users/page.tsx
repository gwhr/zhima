"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface UserItem {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
  createdAt: string;
  tokenBudget: number;
  tokenUsed: number;
  tokenRemaining: number;
  totalCostYuan: number;
  taskConcurrencyLimitOverride: number | null;
  effectiveTaskConcurrencyLimit: number;
  _count: { workspaces: number; orders: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const pageSize = 20;

  async function fetchUsers(nextPage: number = 1, keyword = search) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: String(pageSize),
    });
    if (keyword.trim()) {
      params.set("search", keyword.trim());
    }

    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    if (data.success) {
      setUsers(data.data.users);
      setTotal(data.data.total);
      setPage(nextPage);
    }
    setLoading(false);
  }

  async function setUserConcurrency(user: UserItem) {
    const placeholder =
      user.taskConcurrencyLimitOverride === null
        ? `当前为平台默认(${user.effectiveTaskConcurrencyLimit})，输入空值恢复默认`
        : `当前覆盖值: ${user.taskConcurrencyLimitOverride}，输入空值恢复默认`;
    const raw = window.prompt(
      `${placeholder}\n请输入新的并发上限（1-20）：`,
      user.taskConcurrencyLimitOverride?.toString() ?? ""
    );
    if (raw === null) return;

    const trimmed = raw.trim();
    const parsedOverride = trimmed === "" ? null : Number(trimmed);
    if (
      trimmed !== "" &&
      (!Number.isFinite(parsedOverride) || (parsedOverride ?? 0) <= 0)
    ) {
      setMessage("并发上限必须是正整数，留空表示恢复平台默认值。");
      return;
    }

    setSavingUserId(user.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/risk-control`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskConcurrencyLimitOverride:
            parsedOverride === null ? null : Math.floor(parsedOverride),
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "设置失败");
      }

      setMessage("用户并发上限已更新。");
      await fetchUsers(page, search);
    } catch (setError) {
      setMessage(setError instanceof Error ? setError.message : "设置失败");
    } finally {
      setSavingUserId(null);
    }
  }

  useEffect(() => {
    void fetchUsers(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <div className="flex gap-2">
          <Input
            placeholder="搜索邮箱/手机号/姓名"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void fetchUsers(1, search);
              }
            }}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => void fetchUsers(1, search)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">共 {total} 位用户</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">用户</th>
                    <th className="text-left py-3 px-2 font-medium">联系方式</th>
                    <th className="text-left py-3 px-2 font-medium">角色</th>
                    <th className="text-left py-3 px-2 font-medium">工作空间</th>
                    <th className="text-left py-3 px-2 font-medium">订单</th>
                    <th className="text-left py-3 px-2 font-medium">Token（已用/总额）</th>
                    <th className="text-left py-3 px-2 font-medium">并发上限</th>
                    <th className="text-left py-3 px-2 font-medium">累计 AI 成本</th>
                    <th className="text-left py-3 px-2 font-medium">注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">{user.name || "-"}</td>
                      <td className="py-3 px-2 font-mono text-xs">
                        {user.email || user.phone || "-"}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">{user._count.workspaces}</td>
                      <td className="py-3 px-2">{user._count.orders}</td>
                      <td className="py-3 px-2 tabular-nums">
                        {user.tokenUsed.toLocaleString()} /{" "}
                        {user.tokenBudget.toLocaleString()}
                        <p className="text-xs text-muted-foreground">
                          剩余 {user.tokenRemaining.toLocaleString()}
                        </p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="tabular-nums">
                          {user.taskConcurrencyLimitOverride ??
                            user.effectiveTaskConcurrencyLimit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.taskConcurrencyLimitOverride === null
                            ? "平台默认"
                            : "用户覆盖"}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 px-2 text-xs"
                          disabled={savingUserId === user.id}
                          onClick={() => void setUserConcurrency(user)}
                        >
                          {savingUserId === user.id ? "保存中..." : "设置并发"}
                        </Button>
                      </td>
                      <td className="py-3 px-2 tabular-nums">
                        ¥ {user.totalCostYuan.toFixed(4)}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => void fetchUsers(page - 1)}
              >
                上一页
              </Button>
              <span className="flex items-center text-sm text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => void fetchUsers(page + 1)}
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
