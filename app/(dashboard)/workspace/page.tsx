"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Workspace {
  id: string;
  name: string;
  topic: string;
  status: string;
  createdAt: string;
}

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  GENERATING: { label: "生成中", variant: "default" },
  READY: { label: "就绪", variant: "outline" },
  EXPIRED: { label: "已过期", variant: "destructive" },
};

export default function WorkspaceListPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchWorkspaces() {
    const res = await fetch("/api/workspace");
    const data = await res.json();
    if (data.success) setWorkspaces(data.data);
    setLoading(false);
  }

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspace/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setWorkspaces((prev) => prev.filter((w) => w.id !== deleteTarget.id));
      }
    } catch {
      // ignore
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6 p-6 md:space-y-7 md:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_0%,rgba(14,165,164,0.18),transparent_44%),radial-gradient(circle_at_6%_92%,rgba(249,115,22,0.14),transparent_36%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Workspace Hub
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              我的工作空间
            </h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              在这里管理你的项目链路，从需求确认到生成下载一步到位。
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="w-fit">
            <Plus className="mr-2 h-4 w-4" />
            新建项目
          </Button>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-2xl border border-white/70 bg-white/70"
            />
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <Card className="border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5">
              <Sparkles className="h-6 w-6 text-cyan-700" />
            </div>
            <p className="text-muted-foreground">还没有工作空间，先创建第一个项目吧。</p>
            <Button className="mt-5" onClick={() => setDialogOpen(true)}>
              创建第一个项目
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((ws) => {
            const status = statusMap[ws.status] || statusMap.DRAFT;
            return (
              <Card
                key={ws.id}
                className="group relative cursor-pointer border-white/70 bg-white/85 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_45px_-30px_rgba(15,23,42,0.55)]"
                onClick={() => router.push(`/workspace/${ws.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="line-clamp-2 pr-2 text-lg leading-snug">
                      {ws.name}
                    </CardTitle>
                    <Badge variant={status.variant} className="shrink-0">
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{ws.topic}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {new Date(ws.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(ws);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateWorkspaceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchWorkspaces}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除工作空间「{deleteTarget?.name}」吗？删除后项目相关数据将无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
