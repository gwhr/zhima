import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="mx-auto flex w-full max-w-[1680px] flex-1">
        <Sidebar />
        <main className="relative flex-1 overflow-auto">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/70 to-transparent" />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
}
