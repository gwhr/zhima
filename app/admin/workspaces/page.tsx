"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface WorkspaceItem {
  id: string;
  name: string;
  topic: string;
  status: "DRAFT" | "GENERATING" | "READY" | "EXPIRED";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  _count: {
    files: number;
    taskJobs: number;
    chatMessages: number;
  };
  tokenUsed: number;
  totalCostYuan: number;
}

const statusLabels: Record<
  WorkspaceItem["status"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  GENERATING: { label: "生成中", variant: "default" },
  READY: { label: "就绪", variant: "outline" },
  EXPIRED: { label: "已过期", variant: "destructive" },
};

export default function AdminWorkspacesPage() {
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  async function fetchData(nextPage: number, keyword = search, nextStatus = status) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (keyword.trim()) params.set("search", keyword.trim());
    if (nextStatus !== "ALL") params.set("status", nextStatus);

    const response = await fetch(`/api/admin/workspaces?${params.toString()}`);
    const data = await response.json();
    if (data.success) {
      setItems(data.data.workspaces);
      setTotal(data.data.total);
      setPage(nextPage);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetchData(1, "", "ALL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">工作空间管理</h1>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(event) => {
              const nextStatus = event.target.value;
              setStatus(nextStatus);
              void fetchData(1, search, nextStatus);
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="ALL">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="GENERATING">生成中</option>
            <option value="READY">就绪</option>
            <option value="EXPIRED">已过期</option>
          </select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void fetchData(1, search, status);
              }
            }}
            className="w-72"
            placeholder="搜索项目名/课题/用户"
          />
          <Button variant="outline" size="icon" onClick={() => void fetchData(1)}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">共 {total} 个工作空间</CardTitle>
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
                    <th className="text-left py-3 px-2 font-medium">项目</th>
                    <th className="text-left py-3 px-2 font-medium">所属用户</th>
                    <th className="text-left py-3 px-2 font-medium">状态</th>
                    <th className="text-left py-3 px-2 font-medium">文件/任务/对话</th>
                    <th className="text-left py-3 px-2 font-medium">Token 用量</th>
                    <th className="text-left py-3 px-2 font-medium">AI 成本</th>
                    <th className="text-left py-3 px-2 font-medium">更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const statusMeta = statusLabels[item.status];
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2 min-w-[280px]">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.topic}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                            {item.id}
                          </p>
                        </td>
                        <td className="py-3 px-2">
                          {item.user.name || item.user.email || item.user.phone || "-"}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                        </td>
                        <td className="py-3 px-2 tabular-nums">
                          {item._count.files} / {item._count.taskJobs} / {item._count.chatMessages}
                        </td>
                        <td className="py-3 px-2 tabular-nums">
                          {item.tokenUsed.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 tabular-nums">
                          ¥ {item.totalCostYuan.toFixed(4)}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(item.updatedAt).toLocaleString("zh-CN")}
                        </td>
                      </tr>
                    );
                  })}
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
                onClick={() => void fetchData(page - 1)}
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
                onClick={() => void fetchData(page + 1)}
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
