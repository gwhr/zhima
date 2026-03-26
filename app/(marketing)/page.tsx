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
    title: "AI 代码生成",
    desc: "描述需求，自动生成前后端代码，支持 Spring Boot、Vue、React 等主流框架",
  },
  {
    icon: FileText,
    title: "论文自动撰写",
    desc: "按学术规范分章节生成万字论文，导出标准 Word 格式，支持自定义修改",
  },
  {
    icon: BarChart3,
    title: "图表智能生成",
    desc: "自动生成 ER 图、架构图、流程图等毕设所需的各类技术图表",
  },
  {
    icon: Zap,
    title: "一键生成",
    desc: "选题 → 代码 → 论文，全流程 AI 辅助，大幅提升开发效率",
  },
  {
    icon: Shield,
    title: "原创保障",
    desc: "每次生成都具有随机性，结合多模型调度，确保内容原创性",
  },
  {
    icon: Clock,
    title: "快速交付",
    desc: "数分钟内完成代码框架生成，数小时完成完整毕设项目",
  },
];

const faqs = [
  { q: "生成的代码能直接运行吗？", a: "生成的代码包含完整项目结构和依赖配置，按照说明配置环境后可直接运行。" },
  { q: "论文查重率高吗？", a: "每次生成都会加入随机因子，配合多模型混合使用，有效降低重复率。建议在此基础上根据自身理解进行适当修改。" },
  { q: "支持哪些技术栈？", a: "支持 Java (Spring Boot)、Python (Django/Flask)、Node.js (Express/Nest)、前端 (Vue/React) 等主流技术栈。" },
  { q: "可以修改生成的内容吗？", a: "当然可以，你可以通过 AI 对话随时调整需求，也可以直接修改下载的代码和论文。" },
];

export default function MarketingHome() {
  return (
    <main className="flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
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

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center lg:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground mb-6">
            <Zap className="h-3.5 w-3.5 text-primary" />
            AI 驱动的毕设助手
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            毕设不再难
            <br />
            <span className="text-primary">AI 帮你搞定一切</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            描述你的毕设需求，智码帮你自动生成代码、撰写论文、制作图表。
            选题到答辩，全流程 AI 辅助。
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

      {/* Features */}
      <section id="features" className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">核心功能</h2>
            <p className="mt-3 text-muted-foreground">一站式解决毕业设计全部需求</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
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

      {/* Phase-1 notice */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">一期上线说明</h2>
            <p className="mt-3 text-muted-foreground">当前阶段以功能可用和体验稳定为优先，先开放免费使用</p>
          </div>
          <div className="mx-auto max-w-3xl">
            <Card>
              <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
                <p>1. 一期阶段暂不开放在线付费购买，平台统一提供可用额度。</p>
                <p>2. 用户可直接体验项目创建、代码生成、论文生成、预览与下载完整链路。</p>
                <p>3. 后续会在备案与合规完成后，升级为按 token 计费和权益管理方案。</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-bold text-center mb-12">常见问题</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.q}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 智码 ZhiMa. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
