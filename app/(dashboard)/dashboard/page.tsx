import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FolderOpen, MessageSquare, FileText, Zap } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const [workspaceCount, messageCount, fileCount, jobCount] = await Promise.all([
    db.workspace.count({ where: { userId } }),
    db.chatMessage.count({
      where: { workspace: { userId } },
    }),
    db.workspaceFile.count({
      where: { workspace: { userId } },
    }),
    db.taskJob.count({
      where: { workspace: { userId } },
    }),
  ]);

  const recentWorkspaces = await db.workspace.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, name: true, topic: true, status: true, updatedAt: true },
  });

  const stats = [
    { label: "工作空间", value: workspaceCount, icon: FolderOpen, color: "text-blue-600" },
    { label: "对话消息", value: messageCount, icon: MessageSquare, color: "text-green-600" },
    { label: "生成文件", value: fileCount, icon: FileText, color: "text-purple-600" },
    { label: "执行任务", value: jobCount, icon: Zap, color: "text-orange-600" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          欢迎回来，{session.user?.name || "用户"}
        </h1>
        <p className="text-muted-foreground mt-1">这里是你的毕设助手工作台</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近项目</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/workspace">查看全部</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentWorkspaces.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">还没有项目</p>
                <Button asChild>
                  <Link href="/workspace">创建第一个项目</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentWorkspaces.map((ws) => (
                  <Link
                    key={ws.id}
                    href={`/workspace/${ws.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{ws.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                        {ws.topic}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(ws.updatedAt).toLocaleDateString("zh-CN")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>快速开始</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/workspace"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">新建毕设项目</p>
                <p className="text-xs text-muted-foreground">创建工作空间，开始生成</p>
              </div>
            </Link>
            <Link
              href="/dashboard/referral"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">邀请好友</p>
                <p className="text-xs text-muted-foreground">分享邀请码，获得奖励</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
