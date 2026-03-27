import { Code2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f9fcff_0%,#f2f7fd_45%,#eef3f9_100%)]">
      <div className="pointer-events-none absolute -left-24 top-12 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-orange-300/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1320px]">
        <div className="hidden w-1/2 flex-col justify-between p-10 lg:flex xl:p-14">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-md shadow-cyan-500/30">
              <Code2 className="h-5 w-5" />
            </span>
            智码 ZhiMa
          </Link>

          <div className="max-w-md space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
              AI 毕设助手
            </div>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900">
              让毕业设计
              <br />
              从“能做”变成“做好”
            </h2>
            <p className="text-base text-slate-600">
              选题、功能拆解、代码生成、论文整理，一条链路协同推进，减少反复与卡点。
            </p>
          </div>

          <p className="text-sm text-slate-500">© 2026 智码 ZhiMa</p>
        </div>

        <div className="flex w-full items-center justify-center p-6 sm:p-8 lg:w-1/2 lg:justify-end lg:pr-10 xl:pr-14">
          {children}
        </div>
      </div>
    </div>
  );
}
