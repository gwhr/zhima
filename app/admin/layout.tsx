import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";
import { BarChart3, Users, FileBox, ShieldCheck } from "lucide-react";

const adminNav = [
  { href: "/admin", icon: BarChart3, label: "数据概览" },
  { href: "/admin/users", icon: Users, label: "用户管理" },
  { href: "/admin/orders", icon: FileBox, label: "订单管理" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <aside className="hidden lg:flex w-56 flex-col border-r bg-sidebar-background p-4">
          <div className="flex items-center gap-2 mb-6 px-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">管理后台</span>
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
