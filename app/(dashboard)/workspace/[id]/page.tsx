"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Code, BarChart3, Settings, Play,
  Download, ArrowLeft, Loader2,
  Users, Layers, ChevronRight, Info,
  Package, BookOpen, HelpCircle, Monitor, Terminal, MessageCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatPanel } from "@/components/chat-panel";
import { CodePreviewDialog } from "@/components/code-preview-dialog";

interface RequirementRole {
  name: string;
  description: string;
}

interface RequirementModule {
  name: string;
  features: string[];
  enabled: boolean;
}

interface Requirements {
  summary?: string;
  roles?: RequirementRole[];
  modules?: RequirementModule[];
  tables?: string[];
}

interface WorkspaceDetail {
  id: string;
  name: string;
  topic: string;
  techStack: Record<string, string>;
  requirements: Requirements;
  status: string;
  createdAt: string;
  _count: { chatMessages: number; files: number; taskJobs: number };
}

interface FileItem {
  id: string;
  path: string;
  type: string;
  size: number;
}

interface Job {
  id: string;
  type: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  GENERATING: { label: "生成中", variant: "default" },
  READY: { label: "就绪", variant: "outline" },
  EXPIRED: { label: "已过期", variant: "destructive" },
};

const jobTypeLabels: Record<string, string> = {
  CODE_GEN: "代码生成",
  THESIS_GEN: "论文生成",
  CHART_RENDER: "图表渲染",
  PREVIEW: "项目预览",
};

const fileTypeIcons: Record<string, typeof Code> = {
  CODE: Code,
  THESIS: FileText,
  CHART: BarChart3,
  CONFIG: Settings,
};

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const loadData = useCallback(async () => {
    const [wsRes, filesRes, jobsRes] = await Promise.all([
      fetch(`/api/workspace/${params.id}`),
      fetch(`/api/workspace/${params.id}/files`),
      fetch(`/api/workspace/${params.id}/jobs`),
    ]);
    const [wsData, filesData, jobsData] = await Promise.all([
      wsRes.json(), filesRes.json(), jobsRes.json(),
    ]);

    if (wsData.success) setWorkspace(wsData.data);
    if (filesData.success) setFiles(filesData.data);
    if (jobsData.success) setJobs(jobsData.data);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === "PENDING" || j.status === "RUNNING");
    if (!hasRunning) return;

    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [jobs, loadData]);

  async function triggerGenerate(type: "code" | "thesis") {
    setGenerating(type);
    const endpoints: Record<string, string> = {
      code: "generate-code",
      thesis: "generate-thesis",
    };
    await fetch(`/api/workspace/${params.id}/${endpoints[type]}`, { method: "POST" });
    await loadData();
    setGenerating(null);
  }

  function downloadFiles(type: "code" | "thesis" | "chart" | "all") {
    const url = `/api/workspace/${params.id}/download?type=${type}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive mb-4">工作空间不存在</p>
        <Button variant="outline" onClick={() => router.push("/workspace")}>
          返回列表
        </Button>
      </div>
    );
  }

  const status = statusMap[workspace.status] || statusMap.DRAFT;

  const colorMap: Record<string, { bg: string; text: string; progressBg: string }> = {
    blue:   { bg: "bg-blue-100",   text: "text-blue-600",   progressBg: "bg-blue-500" },
    green:  { bg: "bg-green-100",  text: "text-green-600",  progressBg: "bg-green-500" },
    purple: { bg: "bg-purple-100", text: "text-purple-600", progressBg: "bg-purple-500" },
    amber:  { bg: "bg-amber-100",  text: "text-amber-600",  progressBg: "bg-amber-500" },
  };

  function getJobForType(jobType: string) {
    return jobs.find((j) => j.type === jobType && j.status !== "COMPLETED") ||
           jobs.find((j) => j.type === jobType);
  }

  function renderStepCard({ step, color, title, desc, jobType, action, disabled }: {
    step: number;
    color: string;
    title: string;
    desc: string;
    jobType: string;
    action: React.ReactNode;
    disabled?: boolean;
  }) {
    const c = colorMap[color] || colorMap.blue;
    const job = getJobForType(jobType);
    const isRunning = job?.status === "RUNNING" || job?.status === "PENDING";
    const isCompleted = job?.status === "COMPLETED";
    const isFailed = job?.status === "FAILED";

    return (
      <div className={`rounded-lg border p-3 transition-colors ${disabled ? "opacity-60" : "hover:bg-muted/30"} ${isRunning ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200" : ""} ${isCompleted ? "border-green-300 bg-green-50/30" : ""} ${isFailed ? "border-red-300 bg-red-50/30" : ""}`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${isCompleted ? "bg-green-100 text-green-600" : `${c.bg} ${c.text}`} text-xs font-bold shrink-0`}>
            {isCompleted ? "✓" : step}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{title}</p>
                  {isRunning && (
                    <Badge className="text-xs bg-blue-500 animate-pulse">进行中</Badge>
                  )}
                  {isCompleted && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300">已完成</Badge>
                  )}
                  {isFailed && (
                    <Badge variant="destructive" className="text-xs">失败</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              {action}
            </div>
            {job && (isRunning || isFailed) && (
              <div className="mt-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {isRunning ? "正在生成中，请稍候..." : ""}
                  </span>
                  <span className="font-medium tabular-nums">{job.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isFailed ? "bg-red-500" : c.progressBg} ${isRunning ? "animate-pulse" : ""}`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                {job.error && (
                  <p className="text-xs text-red-500 mt-1">{job.error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/workspace")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{workspace.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{workspace.topic}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Chat + Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Overview */}
          {workspace.requirements && (workspace.requirements.roles?.length || workspace.requirements.modules?.length) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  项目概览
                </CardTitle>
                {workspace.requirements.summary && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {workspace.requirements.summary}
                  </p>
                )}
                {Object.keys(workspace.techStack).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(workspace.techStack).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Roles */}
                {workspace.requirements.roles && workspace.requirements.roles.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">系统角色</span>
                      <Badge variant="secondary" className="text-xs">{workspace.requirements.roles.length} 个角色</Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {workspace.requirements.roles.map((role, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg border p-3 bg-muted/30">
                          <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                            {role.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{role.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{role.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {workspace.requirements.roles?.length && workspace.requirements.modules?.length ? <Separator /> : null}

                {/* Modules */}
                {workspace.requirements.modules && workspace.requirements.modules.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">功能模块</span>
                      <Badge variant="secondary" className="text-xs">{workspace.requirements.modules.length} 个模块</Badge>
                    </div>
                    <div className="space-y-2">
                      {workspace.requirements.modules.map((mod, i) => (
                        <details key={i} className="group rounded-lg border bg-muted/30">
                          <summary className="flex items-center gap-2 cursor-pointer p-3 text-sm font-medium hover:bg-muted/50 transition-colors list-none">
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
                            {mod.name}
                            <Badge variant="outline" className="ml-auto text-xs">{mod.features.length} 项功能</Badge>
                          </summary>
                          <div className="px-3 pb-3 pt-0">
                            <ul className="space-y-1 ml-5">
                              {mod.features.map((feat, j) => (
                                <li key={j} className="text-xs text-muted-foreground list-disc">{feat}</li>
                              ))}
                            </ul>
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tables */}
                {workspace.requirements.tables && workspace.requirements.tables.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">数据库表</span>
                        <Badge variant="secondary" className="text-xs">{workspace.requirements.tables.length} 张表</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {workspace.requirements.tables.map((table, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-mono">{table}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions - Step by step guide */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">操作</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">按顺序点击下方按钮，AI 将为你逐步生成毕设所需内容</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {renderStepCard({
                step: 1,
                color: "blue",
                title: "生成项目代码",
                desc: "根据功能模块和技术栈，自动生成完整的项目源代码",
                jobType: "CODE_GEN",
                action: (
                  <Button
                    size="sm"
                    onClick={() => triggerGenerate("code")}
                    disabled={generating !== null}
                    className="shrink-0"
                  >
                    {generating === "code" ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <Code className="mr-1.5 h-3 w-3" />
                    )}
                    生成代码
                  </Button>
                ),
              })}

              {renderStepCard({
                step: 2,
                color: "green",
                title: "生成毕业论文",
                desc: "一键生成完整论文：封面、目录、ER图、架构图、用例图、数据库表格、参考文献、致谢全部自动嵌入",
                jobType: "THESIS_GEN",
                action: (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerGenerate("thesis")}
                    disabled={generating !== null}
                    className="shrink-0"
                  >
                    {generating === "thesis" ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <FileText className="mr-1.5 h-3 w-3" />
                    )}
                    生成论文
                  </Button>
                ),
              })}

              {renderStepCard({
                step: 3,
                color: "amber",
                title: "预览代码 & 下载",
                desc: "查看所有生成的文件内容，或一键打包下载",
                jobType: "PREVIEW",
                disabled: files.length === 0,
                action: (
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={files.length === 0}
                      onClick={() => setShowPreview(true)}
                    >
                      <Play className="mr-1.5 h-3 w-3" />
                      预览
                    </Button>
                    <Button size="sm" variant="outline" disabled={files.length === 0} onClick={() => downloadFiles("all")}>
                      <Download className="mr-1.5 h-3 w-3" />
                      下载全部
                    </Button>
                  </div>
                ),
              })}

              <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-600">
                <Info className="h-3.5 w-3.5 shrink-0" />
                有任何问题可以在下方 AI 对话中随时提问，AI 会根据你的项目进行解答
              </div>
            </CardContent>
          </Card>

          {/* Chat */}
          <Card className="h-[480px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">AI 对话</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ChatPanel
                workspaceId={workspace.id}
                files={files}
                onFileApplied={loadData}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Download packages */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">项目文件</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">生成完成后可下载对应的压缩包</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const codeFiles = files.filter((f) => f.type === "CODE");
                const thesisFiles = files.filter((f) => f.type === "THESIS");
                const chartFiles = files.filter((f) => f.type === "CHART");
                const hasCode = codeFiles.length > 0;
                const hasThesis = thesisFiles.length > 0;
                const hasChart = chartFiles.length > 0;
                const hasAny = hasCode || hasThesis || hasChart;

                return (
                  <div className="space-y-2.5">
                    <div className={`flex items-center gap-3 rounded-lg border p-3 ${hasCode ? "bg-blue-50/50 border-blue-200" : "bg-muted/30"}`}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${hasCode ? "bg-blue-100" : "bg-gray-100"}`}>
                        <Package className={`h-5 w-5 ${hasCode ? "text-blue-600" : "text-gray-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">项目源代码</p>
                        <p className="text-xs text-muted-foreground">
                          {hasCode ? `${codeFiles.length} 个文件` : "尚未生成"}
                        </p>
                      </div>
                      <Button size="sm" variant={hasCode ? "default" : "outline"} disabled={!hasCode} className="shrink-0" onClick={() => downloadFiles("code")}>
                        <Download className="mr-1 h-3 w-3" />
                        下载
                      </Button>
                    </div>

                    <div className={`flex items-center gap-3 rounded-lg border p-3 ${hasThesis ? "bg-green-50/50 border-green-200" : "bg-muted/30"}`}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${hasThesis ? "bg-green-100" : "bg-gray-100"}`}>
                        <BookOpen className={`h-5 w-5 ${hasThesis ? "text-green-600" : "text-gray-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">毕业论文</p>
                        <p className="text-xs text-muted-foreground">
                          {hasThesis ? `${thesisFiles.length} 个文件` : "尚未生成"}
                        </p>
                      </div>
                      <Button size="sm" variant={hasThesis ? "default" : "outline"} disabled={!hasThesis} className="shrink-0" onClick={() => downloadFiles("thesis")}>
                        <Download className="mr-1 h-3 w-3" />
                        下载
                      </Button>
                    </div>

                    {hasChart && (
                      <div className="flex items-center gap-3 rounded-lg border p-3 bg-purple-50/50 border-purple-200">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                          <BarChart3 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">图表文件</p>
                          <p className="text-xs text-muted-foreground">{chartFiles.length} 个文件</p>
                        </div>
                        <Button size="sm" className="shrink-0" onClick={() => downloadFiles("chart")}>
                          <Download className="mr-1 h-3 w-3" />
                          下载
                        </Button>
                      </div>
                    )}

                    {hasAny && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowGuide(true)}
                      >
                        <HelpCircle className="mr-2 h-4 w-4" />
                        如何本地运行项目
                      </Button>
                    )}

                    {!hasAny && (
                      <div className="rounded-md bg-muted/50 px-3 py-4 text-center">
                        <p className="text-xs text-muted-foreground">点击左侧「生成代码」或「生成论文」后</p>
                        <p className="text-xs text-muted-foreground">文件将显示在这里供你下载</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "对话消息", value: workspace._count.chatMessages },
                { label: "文件数量", value: workspace._count.files },
                { label: "任务数量", value: workspace._count.taskJobs },
                { label: "创建时间", value: new Date(workspace.createdAt).toLocaleDateString("zh-CN") },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Code preview dialog */}
      <CodePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        workspaceId={workspace.id}
        files={files}
      />

      {/* How to run locally dialog */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              如何本地运行项目
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 text-sm">
            {/* Environment */}
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Monitor className="h-4 w-4 text-blue-500" />
                1. 准备开发环境
              </h3>
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs text-muted-foreground">
                {workspace.techStack.backend?.includes("java") && (
                  <>
                    <p>• 安装 <strong className="text-foreground">JDK 17+</strong>（推荐从 <a href="https://adoptium.net" target="_blank" className="text-blue-500 underline">adoptium.net</a> 下载）</p>
                    <p>• 安装 <strong className="text-foreground">Maven 3.8+</strong> 或使用项目自带的 mvnw</p>
                  </>
                )}
                {workspace.techStack.backend?.includes("node") && (
                  <p>• 安装 <strong className="text-foreground">Node.js 18+</strong>（推荐从 <a href="https://nodejs.org" target="_blank" className="text-blue-500 underline">nodejs.org</a> 下载）</p>
                )}
                {workspace.techStack.database?.includes("mysql") && (
                  <p>• 安装 <strong className="text-foreground">MySQL 8.0+</strong> 并创建数据库</p>
                )}
                {workspace.techStack.database?.includes("postgresql") && (
                  <p>• 安装 <strong className="text-foreground">PostgreSQL 15+</strong> 并创建数据库</p>
                )}
                {workspace.techStack.frontend?.includes("vue") && (
                  <p>• 安装 <strong className="text-foreground">Node.js 18+</strong>（用于前端 Vue 项目）</p>
                )}
                {workspace.techStack.frontend?.includes("react") && (
                  <p>• 安装 <strong className="text-foreground">Node.js 18+</strong>（用于前端 React 项目）</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Backend */}
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-green-500" />
                2. 启动后端
              </h3>
              {workspace.techStack.backend?.includes("java") ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">解压项目源代码，进入后端目录：</p>
                  <pre className="rounded-md bg-gray-900 text-gray-100 p-3 text-xs overflow-x-auto">
{`# 进入后端项目目录
cd backend

# 修改数据库配置
# 编辑 src/main/resources/application.yml
# 将数据库地址、用户名、密码改为你本地的

# 初始化数据库（导入 SQL 文件）
mysql -u root -p your_database < sql/init.sql

# 启动项目
mvn spring-boot:run`}
                  </pre>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">解压项目源代码，进入后端目录：</p>
                  <pre className="rounded-md bg-gray-900 text-gray-100 p-3 text-xs overflow-x-auto">
{`# 进入后端项目目录
cd backend

# 安装依赖
npm install

# 修改 .env 文件中的数据库配置

# 启动项目
npm run dev`}
                  </pre>
                </div>
              )}
            </div>

            <Separator />

            {/* Frontend */}
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Monitor className="h-4 w-4 text-purple-500" />
                3. 启动前端
              </h3>
              <pre className="rounded-md bg-gray-900 text-gray-100 p-3 text-xs overflow-x-auto">
{`# 进入前端项目目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 浏览器打开 http://localhost:5173 查看`}
              </pre>
            </div>

            <Separator />

            {/* Help */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <h3 className="font-medium flex items-center gap-2 text-amber-700 mb-1">
                <MessageCircle className="h-4 w-4" />
                遇到问题？
              </h3>
              <p className="text-xs text-amber-600">
                如果本地部署遇到困难，可以联系客服提供<strong>远程部署服务</strong>，我们帮你把项目跑起来。
                也可以在工作空间的 AI 对话中描述你的报错信息，AI 会帮你排查。
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
