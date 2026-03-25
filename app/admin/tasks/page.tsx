"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface TaskItem {
  id: string;
  type: "CODE_GEN" | "THESIS_GEN" | "CHART_RENDER" | "PREVIEW";
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  stage: string | null;
  detail: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  workspace: {
    id: string;
    name: string;
    topic: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
    };
  };
}

interface TaskResponse {
  jobs: TaskItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    PENDING: number;
    RUNNING: number;
    COMPLETED: number;
    FAILED: number;
  };
}

const statusMeta: Record<
  TaskItem["status"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  PENDING: { label: "排队中", variant: "secondary" },
  RUNNING: { label: "运行中", variant: "default" },
  COMPLETED: { label: "已完成", variant: "outline" },
  FAILED: { label: "已失败", variant: "destructive" },
};

const typeLabel: Record<TaskItem["type"], string> = {
  CODE_GEN: "代码生成",
  THESIS_GEN: "论文生成",
  CHART_RENDER: "图表渲染",
  PREVIEW: "预览构建",
};

export default function AdminTasksPage() {
  const [data, setData] = useState<TaskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const pageSize = 20;

  async function fetchTasks(
    nextPage: number,
    keyword = search,
    nextStatus = status,
    nextType = type
  ) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (keyword.trim()) params.set("search", keyword.trim());
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextType !== "ALL") params.set("type", nextType);

    const response = await fetch(`/api/admin/tasks?${params.toString()}`);
    const result = await response.json();
    if (result.success) {
      setData(result.data);
      setPage(nextPage);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetchTasks(1, "", "ALL", "ALL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">任务中心</h1>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(event) => {
              const nextStatus = event.target.value;
              setStatus(nextStatus);
              void fetchTasks(1, search, nextStatus, type);
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="ALL">全部状态</option>
            <option value="PENDING">排队中</option>
            <option value="RUNNING">运行中</option>
            <option value="COMPLETED">已完成</option>
            <option value="FAILED">已失败</option>
          </select>
          <select
            value={type}
            onChange={(event) => {
              const nextType = event.target.value;
              setType(nextType);
              void fetchTasks(1, search, status, nextType);
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="ALL">全部类型</option>
            <option value="CODE_GEN">代码生成</option>
            <option value="THESIS_GEN">论文生成</option>
            <option value="CHART_RENDER">图表渲染</option>
            <option value="PREVIEW">预览构建</option>
          </select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void fetchTasks(1, search, status, type);
              }
            }}
            className="w-72"
            placeholder="搜索任务/工作空间/用户"
          />
          <Button variant="outline" size="icon" onClick={() => void fetchTasks(1)}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">排队中</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{data.summary.PENDING}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">运行中</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{data.summary.RUNNING}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">已完成</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{data.summary.COMPLETED}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">已失败</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{data.summary.FAILED}</CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">任务列表</CardTitle>
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
                    <th className="text-left py-3 px-2 font-medium">任务</th>
                    <th className="text-left py-3 px-2 font-medium">工作空间</th>
                    <th className="text-left py-3 px-2 font-medium">用户</th>
                    <th className="text-left py-3 px-2 font-medium">状态/进度</th>
                    <th className="text-left py-3 px-2 font-medium">模型</th>
                    <th className="text-left py-3 px-2 font-medium">Token</th>
                    <th className="text-left py-3 px-2 font-medium">时间</th>
                    <th className="text-left py-3 px-2 font-medium">错误</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.jobs.map((job) => (
                    <tr key={job.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <p className="font-medium">{typeLabel[job.type]}</p>
                        <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                      </td>
                      <td className="py-3 px-2 min-w-[220px]">
                        <p>{job.workspace.name}</p>
                        <p className="text-xs text-muted-foreground">{job.workspace.topic}</p>
                      </td>
                      <td className="py-3 px-2">
                        {job.workspace.user.name ||
                          job.workspace.user.email ||
                          job.workspace.user.phone ||
                          "-"}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={statusMeta[job.status].variant}>
                          {statusMeta[job.status].label}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{job.progress}%</p>
                        {job.stage && (
                          <p className="text-xs text-muted-foreground mt-1">{job.stage}</p>
                        )}
                      </td>
                      <td className="py-3 px-2 font-mono text-xs">{job.model || "-"}</td>
                      <td className="py-3 px-2 tabular-nums">
                        {job.totalTokens !== null
                          ? job.totalTokens.toLocaleString()
                          : "-"}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                        {new Date(job.createdAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="py-3 px-2 text-xs text-red-600">
                        {job.error || "-"}
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
                onClick={() => void fetchTasks(page - 1)}
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
                onClick={() => void fetchTasks(page + 1)}
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
