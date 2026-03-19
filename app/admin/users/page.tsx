"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface UserItem {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
  createdAt: string;
  _count: { workspaces: number; orders: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  async function fetchUsers(p: number = 1) {
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    if (data.success) {
      setUsers(data.data.users);
      setTotal(data.data.total);
      setPage(p);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <div className="flex gap-2">
          <Input
            placeholder="搜索邮箱/手机号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
            onKeyDown={(e) => e.key === "Enter" && fetchUsers(1)}
          />
          <Button variant="outline" size="icon" onClick={() => fetchUsers(1)}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">共 {total} 位用户</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">用户</th>
                  <th className="text-left py-3 px-2 font-medium">联系方式</th>
                  <th className="text-left py-3 px-2 font-medium">角色</th>
                  <th className="text-left py-3 px-2 font-medium">项目数</th>
                  <th className="text-left py-3 px-2 font-medium">订单数</th>
                  <th className="text-left py-3 px-2 font-medium">注册时间</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">{u.name || "-"}</td>
                    <td className="py-3 px-2 font-mono text-xs">
                      {u.email || u.phone || "-"}
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">{u._count.workspaces}</td>
                    <td className="py-3 px-2">{u._count.orders}</td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => fetchUsers(page - 1)}
              >
                上一页
              </Button>
              <span className="flex items-center text-sm text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => fetchUsers(page + 1)}
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
