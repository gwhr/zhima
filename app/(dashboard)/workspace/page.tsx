"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
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

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
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
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的工作空间</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新建项目
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : workspaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500">还没有工作空间</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              创建第一个项目
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => {
            const status = statusMap[ws.status] || statusMap.DRAFT;
            return (
              <Card
                key={ws.id}
                className="group relative cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/workspace/${ws.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg pr-8">{ws.name}</CardTitle>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{ws.topic}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {new Date(ws.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
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
