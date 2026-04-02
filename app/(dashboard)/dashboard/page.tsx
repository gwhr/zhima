import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FolderOpen, MessageSquare, FileText, Zap, ArrowRight, Home } from "lucide-react";

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
    {
      label: "工作空间",
      value: workspaceCount,
      icon: FolderOpen,
      tone: "from-cyan-500/20 to-cyan-500/5 text-cyan-700",
    },
    {
      label: "对话消息",
      value: messageCount,
      icon: MessageSquare,
      tone: "from-emerald-500/20 to-emerald-500/5 text-emerald-700",
    },
    {
      label: "生成文件",
      value: fileCount,
      icon: FileText,
      tone: "from-amber-500/20 to-amber-500/5 text-amber-700",
    },
    {
      label: "执行任务",
      value: jobCount,
      icon: Zap,
      tone: "from-indigo-500/20 to-indigo-500/5 text-indigo-700",
    },
  ];

  return (
    <div className="space-y-6 p-6 md:space-y-7 md:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(14,165,164,0.16),transparent_45%),radial-gradient(circle_at_0%_100%,rgba(249,115,22,0.14),transparent_40%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Welcome Back
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              欢迎回来，{session.user?.name || "用户"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              继续推进你的毕业设计，从需求确认到代码与论文输出一站完成。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
                返回首页
              </Link>
            </Button>
            <Button asChild>
              <Link href="/workspace">
                新建工作空间
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/referral">查看推广链接</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="overflow-hidden border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]"
          >
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <div
                className={`absolute inset-x-4 top-4 h-8 rounded-full bg-gradient-to-r blur-xl ${s.tone}`}
              />
              <CardTitle className="relative text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <span className={`relative rounded-xl bg-gradient-to-br p-2 ${s.tone}`}>
                <s.icon className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近项目</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/workspace">查看全部</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentWorkspaces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 py-10 text-center">
                <p className="mb-4 text-muted-foreground">还没有项目，先创建一个开始吧。</p>
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
                    className="flex items-center justify-between rounded-xl border border-transparent bg-muted/20 p-3 transition-all hover:-translate-y-0.5 hover:border-border/70 hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{ws.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {ws.topic}
                      </p>
                    </div>
                    <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                      {new Date(ws.updatedAt).toLocaleDateString("zh-CN")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
          <CardHeader>
            <CardTitle>快速开始</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/workspace"
              className="group flex items-center gap-3 rounded-xl border border-border/70 bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5">
                <FolderOpen className="h-5 w-5 text-cyan-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">新建毕设项目</p>
                <p className="text-xs text-muted-foreground">
                  创建工作空间，开始代码与论文生成流程
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/referral"
              className="group flex items-center gap-3 rounded-xl border border-border/70 bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400/20 to-orange-400/5">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">邀请好友</p>
                <p className="text-xs text-muted-foreground">生成推广链接，便于邀请同学注册</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
