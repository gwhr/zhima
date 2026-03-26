"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface AuditItem {
  id: string;
  action: string;
  module: string | null;
  targetType: string | null;
  targetId: string | null;
  summary: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: string;
  adminUser: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface AuditResponse {
  items: AuditItem[];
  total: number;
  page: number;
  pageSize: number;
}

function toPrettyJson(value: unknown) {
  if (value === null || value === undefined) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AdminAuditLogsPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  async function fetchLogs(
    nextPage: number,
    keyword = search,
    nextModule = module
  ) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (keyword.trim()) params.set("search", keyword.trim());
    if (nextModule !== "ALL") params.set("module", nextModule);

    const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
    const result = await response.json();
    if (result.success) {
      setData(result.data);
      setPage(nextPage);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetchLogs(1, "", "ALL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">操作日志</h1>
        <div className="flex gap-2">
          <select
            value={module}
            onChange={(event) => {
              const nextModule = event.target.value;
              setModule(nextModule);
              void fetchLogs(1, search, nextModule);
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="ALL">全部模块</option>
            <option value="platform">平台配置</option>
            <option value="users">用户管理</option>
            <option value="templates">论文模板</option>
            <option value="announcements">系统公告</option>
          </select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void fetchLogs(1, search, module);
              }
            }}
            className="w-72"
            placeholder="搜索 action/摘要/操作人"
          />
          <Button variant="outline" size="icon" onClick={() => void fetchLogs(1)}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">共 {data?.total ?? 0} 条记录</CardTitle>
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
                    <th className="text-left py-3 px-2 font-medium">时间</th>
                    <th className="text-left py-3 px-2 font-medium">模块/动作</th>
                    <th className="text-left py-3 px-2 font-medium">操作人</th>
                    <th className="text-left py-3 px-2 font-medium">目标</th>
                    <th className="text-left py-3 px-2 font-medium">摘要</th>
                    <th className="text-left py-3 px-2 font-medium">详情</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-medium">{item.module || "-"}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {item.action}
                        </p>
                      </td>
                      <td className="py-3 px-2">
                        {item.adminUser?.name ||
                          item.adminUser?.email ||
                          item.adminUser?.phone ||
                          "-"}
                      </td>
                      <td className="py-3 px-2">
                        <p>{item.targetType || "-"}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {item.targetId || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="max-w-[280px] whitespace-pre-wrap break-all">
                          {item.summary || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary">
                            查看 JSON
                          </summary>
                          <pre className="mt-2 rounded bg-muted p-2 overflow-x-auto">
                            {toPrettyJson({
                              before: item.before,
                              after: item.after,
                              metadata: item.metadata,
                            })}
                          </pre>
                        </details>
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
                onClick={() => void fetchLogs(page - 1)}
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
                onClick={() => void fetchLogs(page + 1)}
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
