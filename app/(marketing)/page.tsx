import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Code2,
  FileText,
  BarChart3,
  Zap,
  Shield,
  Clock,
  ArrowRight,
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
    a: "当然可以。你可以通过 AI 对话持续调整需求，也可以在下载后自行修改代码和文稿内容。",
  },
];

export default function MarketingHome() {
  return (
    <main className="flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Code2 className="h-6 w-6 text-primary" />
            <span>智码 ZhiMa</span>
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">登录</Link>
            </Button>
            <Button asChild>
              <Link href="/register">免费注册</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center lg:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            毕设辅导与开发助手
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            毕业设计有人带，推进更稳
            <br />
            <span className="text-primary">你主导，AI 辅助</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            智码聚焦毕业设计辅导场景，提供需求拆解、代码示例、论文结构和图表参考，
            帮助你在导师要求下独立完成项目。
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/register">
                免费开始
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">了解更多</Link>
            </Button>
          </div>
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
