import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showcaseProjects } from "@/lib/showcase-projects";
import { FolderOpen, Layers, PlayCircle, Sparkles } from "lucide-react";

export default async function ShowcasePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6 p-6 md:space-y-7 md:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(14,165,164,0.16),transparent_42%),radial-gradient(circle_at_0%_100%,rgba(249,115,22,0.16),transparent_38%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Curated Showcase
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              精选案例
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
              这里展示的是平台精选案例，用来说明平台可交付的项目类型和表现方向；它们不是当前工作空间的在线运行结果。
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-cyan-600" />
            首批先上结构骨架，后续逐步补充真实案例效果
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {showcaseProjects.map((project) => (
          <Card
            key={project.slug}
            className="overflow-hidden border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg leading-snug">{project.title}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">{project.summary}</p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-200 bg-amber-50 text-amber-700"
                >
                  {project.statusLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6 text-center">
                <PlayCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">案例效果位</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  当前先保留占位，等真实精选项目准备好后再补 iframe、截图或演示地址。
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  <span>{project.direction}</span>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Layers className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex flex-wrap gap-1.5">
                    {project.stackTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">功能亮点</p>
                <div className="flex flex-wrap gap-2">
                  {project.highlights.map((item) => (
                    <Badge key={item} variant="outline" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="w-full" disabled>
                案例效果待补充
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
