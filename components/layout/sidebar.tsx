"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Share2,
  ShieldCheck,
  UserCircle,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Workspace {
  id: string;
  name: string;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "仪表盘" },
  { href: "/workspace", icon: FolderOpen, label: "工作空间" },
  { href: "/dashboard/billing", icon: WalletCards, label: "Token 余额" },
  { href: "/dashboard/feedback", icon: MessageSquare, label: "用户反馈" },
  { href: "/dashboard/referral", icon: Share2, label: "邀请推广" },
  { href: "/dashboard/profile", icon: UserCircle, label: "个人设置" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    fetch("/api/workspace")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWorkspaces((data.data || []).slice(0, 10));
        }
      })
      .catch(() => {});
  }, []);

  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-white/70 bg-white/70 backdrop-blur-xl lg:flex">
      <ScrollArea className="flex-1 px-4 py-5">
        <div className="mb-6 rounded-2xl border border-white/70 bg-gradient-to-br from-cyan-500/12 via-transparent to-orange-400/10 p-4 shadow-[0_20px_45px_-35px_rgba(14,165,164,0.8)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            User Console
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">你的项目工作区</p>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                  active
                    ? "bg-primary/12 text-primary shadow-[0_10px_25px_-18px_rgba(14,165,164,0.8)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/75 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg border bg-white/80",
                    active
                      ? "border-primary/25 text-primary"
                      : "border-border/70 text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                pathname.startsWith("/admin")
                  ? "bg-primary/12 text-primary shadow-[0_10px_25px_-18px_rgba(14,165,164,0.8)]"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/75 hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg border bg-white/80",
                  pathname.startsWith("/admin")
                    ? "border-primary/25 text-primary"
                    : "border-border/70 text-muted-foreground"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
              </span>
              管理后台
            </Link>
          )}
        </nav>

        {workspaces.length > 0 && (
          <div className="mt-7 rounded-2xl border border-white/70 bg-white/75 p-3 shadow-[0_16px_45px_-32px_rgba(15,23,42,0.35)]">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-muted-foreground">最近项目</p>
              <Link href="/workspace">
                <Button variant="ghost" size="icon-sm" className="rounded-lg">
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
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    pathname === `/workspace/${ws.id}`
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
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
