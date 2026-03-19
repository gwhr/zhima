"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  CreditCard,
  UserCircle,
  Plus,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface Workspace {
  id: string;
  name: string;
  status: string;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "仪表盘" },
  { href: "/workspace", icon: FolderOpen, label: "工作空间" },
  { href: "/dashboard/billing", icon: CreditCard, label: "套餐管理" },
  { href: "/dashboard/referral", icon: Share2, label: "邀请好友" },
  { href: "/dashboard/profile", icon: UserCircle, label: "个人设置" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setWorkspaces(data.data.slice(0, 10));
      })
      .catch(() => {});
  }, []);

  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-sidebar-background">
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              管理后台
            </Link>
          )}
        </nav>

        {workspaces.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                最近项目
              </p>
              <Link href="/workspace">
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Plus className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="space-y-0.5">
              {workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  href={`/workspace/${ws.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    pathname === `/workspace/${ws.id}`
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <span className="truncate">{ws.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
