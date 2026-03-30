import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f9fcff_0%,#f2f7fd_50%,#eef3f9_100%)] py-12">
      <div className="mx-auto w-full max-w-4xl px-6">
        <div className="rounded-2xl border border-white/80 bg-white/90 p-8 shadow-[0_28px_65px_-42px_rgba(15,23,42,0.6)]">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">用户协议</h1>
          <p className="mt-2 text-sm text-slate-500">最近更新时间：2026年3月28日</p>

          <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
            <section>
              <h2 className="text-base font-semibold text-slate-900">1. 服务说明</h2>
              <p>
                智码提供毕设辅导与开发辅助服务，包括选题建议、功能拆解、示例代码与写作结构参考。
                用户应基于自身学习与课程要求进行独立完善。
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">2. 账号使用</h2>
              <p>
                你应妥善保管账号信息，不得出租、出借或转让账号。因账号保管不当造成的风险由账号持有人承担。
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">3. 合理使用</h2>
              <p>
                你承诺遵守适用法律法规，不利用平台从事违法违规活动。平台可对异常请求、滥用行为采取限制措施。
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">4. 内容与责任</h2>
              <p>
                平台输出内容为辅助建议，不构成对结果的保证。你应自行审核与修改后再提交课程或公开使用。
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">5. 协议更新</h2>
              <p>
                当服务能力或合规要求发生变化时，平台可更新本协议。更新后继续使用服务即视为你已知悉并同意。
              </p>
            </section>
          </div>

          <div className="mt-8 flex items-center gap-4 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">
              查看隐私政策
            </Link>
            <Link href="/" className="text-slate-600 hover:underline">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
