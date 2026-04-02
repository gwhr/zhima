import Link from "next/link";
import { getServerSession } from "next-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getPlatformConfig } from "@/lib/system-config";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  Clock,
  Code2,
  FileText,
  GraduationCap,
  Layers3,
  MessageSquareHeart,
  Rocket,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Code2,
    title: "代码示例辅导",
    desc: "根据你的需求提供项目脚手架、模块拆解与示例实现，便于你自主完善与调试。",
  },
  {
    icon: FileText,
    title: "论文写作辅导",
    desc: "提供论文结构建议、章节提纲与示例参考，帮助你按学校规范完成写作。",
  },
  {
    icon: BarChart3,
    title: "图表与文档辅助",
    desc: "支持生成 ER 图、架构图、流程图等参考图表，方便你二次补充与说明。",
  },
  {
    icon: Zap,
    title: "流程化学习支持",
    desc: "从选题到实现与文档整理，提供分步骤建议和检查清单，帮助你稳步推进。",
  },
  {
    icon: Shield,
    title: "学术规范提醒",
    desc: "强调原创写作、规范引用与合规提交，主力由你完成，平台提供辅助支持。",
  },
  {
    icon: Clock,
    title: "效率提升工具",
    desc: "减少重复劳动，把更多时间留给思考、实验和打磨，提升毕设推进效率。",
  },
];

const highlights = [
  {
    icon: GraduationCap,
    title: "毕设辅导定位",
    desc: "平台提供思路和工具，帮助你把“能做”提升到“做好”，核心成果仍由你主导完成。",
  },
  {
    icon: Layers3,
    title: "全链路协同",
    desc: "从选题、功能拆解、代码草稿、论文提纲到图表资料，形成连续的推进链路。",
  },
  {
    icon: ClipboardCheck,
    title: "过程可控",
    desc: "每一步都有状态反馈和结果预览，避免盲等、误操作和反复返工。",
  },
];

const deliverables = [
  "可下载项目源码（按后端/前端/数据库分类预览）",
  "论文结构化稿件与图表参考材料",
  "任务队列与状态反馈，支持中断、重试与继续",
  "一对一辅导入口（选题把关、部署排错、答辩材料建议）",
];

const faqs = [
  {
    q: "平台生成的代码内容如何使用？",
    a: "平台会基于你的需求生成可用于学习与开发的项目脚手架和示例实现。你可在此基础上按课程要求进行完善、调试与运行。",
  },
  {
    q: "如何保障论文内容质量与规范性？",
    a: "平台提供的是写作辅导与结构化参考，不承诺任何查重结果。建议你结合导师要求进行独立思考与原创撰写，并在提交前自行查重与校对。",
  },
  {
    q: "支持哪些技术栈？",
    a: "支持 Java (Spring Boot)、Python (Django/Flask)、Node.js (Express/Nest)、前端 (Vue/React) 等主流技术栈。",
  },
  {
    q: "可以修改生成的内容吗？",
    a: "当然可以。你可以通过 AI 对话持续调整需求，也可以在下载后自行修改代码和文档内容。",
  },
];

export default async function MarketingHome() {
  const [session, platformConfig] = await Promise.all([
    getServerSession(authOptions),
    getPlatformConfig(),
  ]);

  const consolePath = session?.user?.role === "ADMIN" ? "/admin" : "/dashboard";
  const supportContactTitle =
    platformConfig.supportContactTitle || "一对一辅导（人工）";
  const supportContactDescription =
    platformConfig.supportContactDescription ||
    "可联系客服获取选题把关、部署排错、答辩材料梳理等一对一支持。";
  const supportContactQrUrl =
    platformConfig.supportContactQrUrl || "/support-qr-placeholder.svg";

  return (
    <main className="flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Code2 className="h-6 w-6 text-primary" />
            <span>智码 ZhiMa</span>
          </Link>
          {session?.user ? (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={consolePath}>进入控制台</Link>
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">登录</Link>
              </Button>
              <Button asChild>
                <Link href="/register">免费注册</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center lg:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI 毕设助手 · 辅导协作平台
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            让毕业设计从“能做”
            <br />
            <span className="text-primary">变成“做好”</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            智码聚焦毕业设计辅导场景，提供需求拆解、代码示例、论文结构和图表参考，
            帮助你在导师要求下独立完成项目。
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground">
            当前版本定位为“毕设助手/毕设辅导工具”，用于学习、开发与写作支持，
            不替代学生本人完成学业任务。
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {session?.user ? (
              <Button size="lg" asChild>
                <Link href={consolePath}>
                  进入控制台
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href="/register">
                  免费开始
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">了解更多</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          {highlights.map((item) => (
            <Card key={item.title} className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="features" className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">核心辅导能力</h2>
            <p className="mt-3 text-muted-foreground">
              围绕选题、开发、写作与答辩材料提供辅助支持
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border-0 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {platformConfig.homepageProcessEnabled ? (
        <section className="border-t py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold">{platformConfig.homepageProcessTitle}</h2>
              {platformConfig.homepageProcessDescription ? (
                <p className="mt-3 text-muted-foreground">
                  {platformConfig.homepageProcessDescription}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {platformConfig.homepageProcessSteps.map((step, index) => (
                <Card key={`${step.title}-${index}`} className="border-0 shadow-sm">
                  <CardContent className="flex gap-4 p-5">
                    <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                      {step.imageUrl ? (
                        <img
                          src={step.imageUrl}
                          alt={`步骤 ${index + 1} 配图`}
                          className="mt-3 max-h-48 w-full rounded-md border object-contain"
                        />
                      ) : (
                        <div className="mt-3 flex h-32 w-full items-center justify-center rounded-md border border-dashed bg-muted/30 text-xs text-muted-foreground">
                          后台可上传该步骤配图
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">你将获得什么</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deliverables.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm">
                  <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {platformConfig.supportContactEnabled ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                    <MessageSquareHeart className="h-3.5 w-3.5 text-primary" />
                    一对一辅导
                  </div>
                  <h3 className="text-2xl font-semibold">{supportContactTitle}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {supportContactDescription}
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-3 shadow-sm">
                  <img
                    src={supportContactQrUrl}
                    alt="一对一辅导二维码"
                    className="h-40 w-40 rounded object-contain"
                  />
                  <p className="mt-2 text-center text-xs text-muted-foreground">扫码咨询</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">常见问题</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.q}>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 智码 ZhiMa. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
