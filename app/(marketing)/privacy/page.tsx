import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f9fcff_0%,#f2f7fd_50%,#eef3f9_100%)] py-12">
      <div className="mx-auto w-full max-w-4xl px-6">
        <div className="rounded-2xl border border-white/80 bg-white/90 p-8 shadow-[0_28px_65px_-42px_rgba(15,23,42,0.6)]">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">隐私政策</h1>
          <p className="mt-2 text-sm text-slate-500">最近更新时间：2026年3月28日</p>

          <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
            <section>
              <h2 className="text-base font-semibold text-slate-900">1. 我们收集的信息</h2>
              <p>
                为提供账号登录与服务能力，我们可能收集手机号、邮箱、昵称、登录凭证、使用日志、任务记录与设备基础信息。
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">2. 信息使用目的</h2>
              <p>
                用于账号认证、安全风控、服务优化、故障排查与用户支持。我们仅在实现业务必要范围内使用个人信息。
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">3. 信息存储与保护</h2>
              <p>
                我们采取合理的安全措施保护数据，包括访问控制、传输加密与最小权限原则，降低信息泄露风险。
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">4. 第三方服务</h2>
              <p>
                平台可能接入云存储、模型服务与基础设施供应商。第三方仅在其提供服务所必要的范围内处理相关数据。
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">5. 你的权利</h2>
              <p>
                你可以申请查询、更正或删除账号相关信息。若对隐私政策有疑问，可通过平台运营联系方式反馈。
              </p>
            </section>
          </div>

          <div className="mt-8 flex items-center gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">
              查看用户协议
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
