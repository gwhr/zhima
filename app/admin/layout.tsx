import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Bell,
  ClipboardList,
  FolderKanban,
  KeyRound,
  LayoutTemplate,
  ListChecks,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { getSession } from "@/lib/auth-helpers";

const adminNav = [
  { href: "/admin", icon: BarChart3, label: "概览看板" },
  { href: "/admin/users", icon: Users, label: "用户管理" },
  { href: "/admin/workspaces", icon: FolderKanban, label: "工作空间" },
  { href: "/admin/tasks", icon: ListChecks, label: "任务中心" },
  { href: "/admin/usage", icon: BarChart3, label: "Token 用量" },
  { href: "/admin/orders", icon: Receipt, label: "订单管理" },
  { href: "/admin/templates", icon: LayoutTemplate, label: "论文模板" },
  { href: "/admin/announcements", icon: Bell, label: "系统公告" },
  { href: "/admin/platform", icon: KeyRound, label: "平台配置" },
  { href: "/admin/audit-logs", icon: ClipboardList, label: "操作日志" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r bg-sidebar-background p-4">
          <div className="flex items-center gap-2 mb-6 px-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">管理员后台</span>
          </div>
          <nav className="space-y-1">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
