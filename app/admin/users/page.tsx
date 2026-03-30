"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface UserItem {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
  createdAt: string;
  tokenBudgetOverride: number | null;
  tokenBudget: number;
  tokenUsed: number;
  tokenRemaining: number;
  tokenFrozen: number;
  tokenWalletInitialized: boolean;
  totalCostYuan: number;
  taskConcurrencyLimitOverride: number | null;
  effectiveTaskConcurrencyLimit: number;
  _count: { workspaces: number; orders: number };
}

type UsersResponse = {
  users: UserItem[];
  total: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const pageSize = 20;

  async function fetchUsers(nextPage = 1, keyword = search) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: String(pageSize),
    });
    if (keyword.trim()) params.set("search", keyword.trim());

    const res = await fetch(`/api/admin/users?${params.toString()}`);
    const data = await res.json();
    if (data.success) {
      const payload = data.data as UsersResponse;
      setUsers(payload.users);
      setTotal(payload.total);
      setPage(nextPage);
    } else {
      setMessage(data.error || "加载用户失败");
    }
    setLoading(false);
  }

  async function patchUser(
    userId: string,
    payload: Record<string, unknown>,
    successText: string
  ) {
    setSavingUserId(userId);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/risk-control`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "操作失败");
      setMessage(successText);
      await fetchUsers(page, search);
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "操作失败");
    } finally {
      setSavingUserId(null);
    }
  }

  async function setUserConcurrency(user: UserItem) {
    const raw = window.prompt(
      "请输入并发上限（1-20，留空恢复平台默认）：",
      user.taskConcurrencyLimitOverride?.toString() ?? ""
    );
    if (raw === null) return;
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && (!Number.isFinite(parsed) || (parsed ?? 0) <= 0)) {
      setMessage("并发上限必须为正整数");
      return;
    }
    await patchUser(
      user.id,
      { taskConcurrencyLimitOverride: parsed === null ? null : Math.floor(parsed) },
      "并发上限已更新"
    );
  }

  async function setUserDefaultBudget(user: UserItem) {
    const raw = window.prompt(
      "请输入用户默认总额度（留空恢复平台默认）：",
      user.tokenBudgetOverride?.toString() ?? ""
    );
    if (raw === null) return;
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && (!Number.isFinite(parsed) || (parsed ?? 0) <= 0)) {
      setMessage("默认总额度必须为正整数");
      return;
    }
    await patchUser(
      user.id,
      { tokenBudgetOverride: parsed === null ? null : Math.floor(parsed) },
      "用户默认总额度已更新"
    );
  }

  async function adjustWalletTotal(user: UserItem) {
    const raw = window.prompt(
      "请输入钱包总点数（会自动修正可用余额）：",
      user.tokenBudget.toString()
    );
    if (raw === null) return;
    const parsed = Number(raw.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMessage("钱包总点数必须为正整数");
      return;
    }
    await patchUser(
      user.id,
      { walletTotalPoints: Math.floor(parsed) },
      "钱包余额已调整"
    );
  }

  useEffect(() => {
    void fetchUsers(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <div className="flex gap-2">
          <Input
            placeholder="搜索邮箱/手机号/昵称"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-72"
            onKeyDown={(event) => {
              if (event.key === "Enter") void fetchUsers(1, search);
            }}
          />
          <Button variant="outline" size="icon" onClick={() => void fetchUsers(1, search)}>
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
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-2 py-3 text-left font-medium">用户</th>
                    <th className="px-2 py-3 text-left font-medium">联系方式</th>
                    <th className="px-2 py-3 text-left font-medium">角色</th>
                    <th className="px-2 py-3 text-left font-medium">工作空间</th>
                    <th className="px-2 py-3 text-left font-medium">订单</th>
                    <th className="px-2 py-3 text-left font-medium">钱包（可用/冻结/已用）</th>
                    <th className="px-2 py-3 text-left font-medium">并发上限</th>
                    <th className="px-2 py-3 text-left font-medium">累计模型成本</th>
                    <th className="px-2 py-3 text-left font-medium">注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-2 py-3">{user.name || "-"}</td>
                      <td className="px-2 py-3 font-mono text-xs">
                        {user.email || user.phone || "-"}
                      </td>
                      <td className="px-2 py-3">
                        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">{user._count.workspaces}</td>
                      <td className="px-2 py-3">{user._count.orders}</td>
                      <td className="px-2 py-3 tabular-nums">
                        <p>
                          {user.tokenRemaining.toLocaleString()} /{" "}
                          {user.tokenFrozen.toLocaleString()} /{" "}
                          {user.tokenUsed.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          总点数 {user.tokenBudget.toLocaleString()} ·{" "}
                          {user.tokenWalletInitialized ? "已初始化钱包" : "未初始化钱包"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          默认额度来源：{user.tokenBudgetOverride === null ? "平台默认" : "用户覆盖"}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={savingUserId === user.id}
                            onClick={() => void adjustWalletTotal(user)}
                          >
                            调整余额
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={savingUserId === user.id}
                            onClick={() => void setUserDefaultBudget(user)}
                          >
                            默认额度
                          </Button>
                        </div>
                      </td>
                      <td className="px-2 py-3 tabular-nums">
                        <p>{user.effectiveTaskConcurrencyLimit}</p>
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
                          设置并发
                        </Button>
                      </td>
                      <td className="px-2 py-3 tabular-nums">
                        ¥ {user.totalCostYuan.toFixed(4)}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                    </tr>
                  ))}
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
                onClick={() => void fetchUsers(page - 1)}
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
