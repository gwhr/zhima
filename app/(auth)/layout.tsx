import { Code2 } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Code2 className="h-6 w-6" />
          智码 ZhiMa
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            AI 驱动的
            <br />
            毕设助手
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-md">
            选题、代码、论文、图表，一站式智能生成。让 AI 帮你搞定毕业设计的一切。
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">
          © 2026 智码 ZhiMa
        </p>
      </div>

      {/* Right - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 bg-background">
        {children}
      </div>
    </div>
  );
}
