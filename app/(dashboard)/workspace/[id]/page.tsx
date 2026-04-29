"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Code, BarChart3, Settings, Play,
  Download, ArrowLeft, Loader2,
  Users, Layers, ChevronRight, Info,
  Package, BookOpen, HelpCircle, Monitor, Terminal, MessageCircle,
  CheckCircle2, PencilLine,
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
  majorCategory?: "computer" | "non-computer";
  majorCategoryLabel?: string;
  difficulty?: number;
  feasibility?: string;
  estimatedPages?: number;
  estimatedApis?: number;
  estimatedTables?: number;
  estimatedWords?: number;
  difficultyAssessment?: DifficultyAssessment;
  featureConfirmed?: boolean;
  featureConfirmedAt?: string;
  featureConfirmAction?: "confirm" | "revise";
  featureConfirmInput?: string;
  previewConfirmed?: boolean;
  previewConfirmedAt?: string;
}

interface DifficultyAssessment {
  academic: number;
  practical: number;
  difficulty: number;
  workload: string;
  innovation: number;
  overall: number;
  suggestions: string[];
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
  result?: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
}

const EMPTY_COUNTS: WorkspaceDetail["_count"] = {
  chatMessages: 0,
  files: 0,
  taskJobs: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toSafeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function toSafeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toSafeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return fallback;
}

function toSafeDateString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

function normalizeWorkspaceDetail(raw: unknown): WorkspaceDetail | null {
  if (!isRecord(raw)) return null;

  const rawTechStack = isRecord(raw.techStack) ? raw.techStack : {};
  const techStack: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawTechStack)) {
    const safeValue = toSafeString(value).trim();
    if (safeValue) {
      techStack[key] = safeValue;
    }
  }

  const rawRequirements = isRecord(raw.requirements) ? raw.requirements : {};
  const roles: RequirementRole[] = Array.isArray(rawRequirements.roles)
    ? rawRequirements.roles
        .map((item) => {
          if (!isRecord(item)) return null;
          const name = toSafeString(item.name).trim();
          const description = toSafeString(item.description).trim();
          if (!name) return null;
          return { name, description };
        })
        .filter((item): item is RequirementRole => !!item)
    : [];

  const modules: RequirementModule[] = Array.isArray(rawRequirements.modules)
    ? rawRequirements.modules
        .map((item) => {
          if (!isRecord(item)) return null;
          const name = toSafeString(item.name).trim();
          if (!name) return null;
          const features = Array.isArray(item.features)
            ? item.features
                .map((feature) => toSafeString(feature).trim())
                .filter(Boolean)
            : [];
          return {
            name,
            features,
            enabled: toSafeBoolean(item.enabled, true),
          };
        })
        .filter((item): item is RequirementModule => !!item)
    : [];

  const tables = Array.isArray(rawRequirements.tables)
    ? rawRequirements.tables
        .map((table) => toSafeString(table).trim())
        .filter(Boolean)
    : [];

  const rawAssessment = isRecord(rawRequirements.difficultyAssessment)
    ? rawRequirements.difficultyAssessment
    : null;
  const difficultyAssessment: DifficultyAssessment | undefined = rawAssessment
    ? {
        academic: toSafeNumber(rawAssessment.academic),
        practical: toSafeNumber(rawAssessment.practical),
        difficulty: toSafeNumber(rawAssessment.difficulty),
        workload: toSafeString(rawAssessment.workload),
        innovation: toSafeNumber(rawAssessment.innovation),
        overall: toSafeNumber(rawAssessment.overall),
        suggestions: Array.isArray(rawAssessment.suggestions)
          ? rawAssessment.suggestions
              .map((item) => toSafeString(item).trim())
              .filter(Boolean)
          : [],
      }
    : undefined;

  const requirements: Requirements = {
    summary: toSafeString(rawRequirements.summary),
    roles,
    modules,
    tables,
    majorCategory:
      rawRequirements.majorCategory === "non-computer" ? "non-computer" : "computer",
    majorCategoryLabel: toSafeString(rawRequirements.majorCategoryLabel),
    difficulty: toSafeNumber(rawRequirements.difficulty),
    feasibility: toSafeString(rawRequirements.feasibility),
    estimatedPages: toSafeNumber(rawRequirements.estimatedPages),
    estimatedApis: toSafeNumber(rawRequirements.estimatedApis),
    estimatedTables: toSafeNumber(rawRequirements.estimatedTables),
    estimatedWords: toSafeNumber(rawRequirements.estimatedWords),
    difficultyAssessment,
    featureConfirmed: toSafeBoolean(rawRequirements.featureConfirmed),
    featureConfirmedAt: toSafeString(rawRequirements.featureConfirmedAt),
    featureConfirmAction:
      rawRequirements.featureConfirmAction === "revise" ? "revise" : "confirm",
    featureConfirmInput: toSafeString(rawRequirements.featureConfirmInput),
    previewConfirmed: toSafeBoolean(rawRequirements.previewConfirmed),
    previewConfirmedAt: toSafeString(rawRequirements.previewConfirmedAt),
  };

  const rawCount = isRecord(raw._count) ? raw._count : {};
  const count = {
    chatMessages: toSafeNumber(rawCount.chatMessages),
    files: toSafeNumber(rawCount.files),
    taskJobs: toSafeNumber(rawCount.taskJobs),
  };

  const id = toSafeString(raw.id).trim();
  if (!id) return null;

  return {
    id,
    name: toSafeString(raw.name).trim() || "未命名项目",
    topic: toSafeString(raw.topic).trim(),
    techStack,
    requirements,
    status: toSafeString(raw.status).trim() || "DRAFT",
    createdAt: toSafeDateString(raw.createdAt),
    _count: count,
  };
}

function normalizeFileItems(raw: unknown): FileItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!isRecord(item)) return null;
      const id = toSafeString(item.id).trim();
      if (!id) return null;
      const path = toSafeString(item.path).trim();
      return {
        id,
        path,
        type: toSafeString(item.type, "CODE"),
        size: Math.max(0, toSafeNumber(item.size)),
      };
    })
    .filter((item): item is FileItem => !!item && !!item.path);
}

function normalizeJobs(raw: unknown): Job[] {
  if (!Array.isArray(raw)) return [];
  const jobs: Job[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = toSafeString(item.id).trim();
    if (!id) continue;
    jobs.push({
      id,
      type: toSafeString(item.type, "CODE_GEN"),
      status: toSafeString(item.status, "PENDING"),
      progress: Math.min(100, Math.max(0, toSafeNumber(item.progress))),
      result: isRecord(item.result) ? item.result : null,
      error: toSafeString(item.error) || null,
      createdAt: toSafeDateString(item.createdAt),
    });
  }
  return jobs;
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
  PREVIEW: "源码浏览",
};

const fileTypeIcons: Record<string, typeof Code> = {
  CODE: Code,
  THESIS: FileText,
  CHART: BarChart3,
  CONFIG: Settings,
};

const jobStageHints: Record<string, string[]> = {
  CODE_GEN: [
    "正在分析需求并构建代码生成提示词",
    "正在规划项目目录结构",
    "正在生成后端核心模块",
    "正在生成前端页面与交互",
    "正在整理配置与运行说明",
  ],
  THESIS_GEN: [
    "正在整理论文大纲",
    "正在生成摘要与绪论",
    "正在完善各章节正文",
    "正在补充图表与参考内容",
    "正在进行排版与导出",
  ],
  PREVIEW: [
    "正在读取项目文件",
    "正在构建源码目录树",
    "正在渲染源码浏览面板",
  ],
};

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [confirmingRequirements, setConfirmingRequirements] = useState(false);
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [reviseIdea, setReviseIdea] = useState("");
  const [confirmMsg, setConfirmMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [generateMsg, setGenerateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [downloadingType, setDownloadingType] = useState<
    "code" | "thesis" | "chart" | "all" | null
  >(null);
  const [downloadMsg, setDownloadMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }
    try {
      const [wsRes, filesRes, jobsRes] = await Promise.all([
        fetch(`/api/workspace/${params.id}`),
        fetch(`/api/workspace/${params.id}/files`),
        fetch(`/api/workspace/${params.id}/jobs`),
      ]);

      const parseJsonSafe = async (res: Response) => {
        try {
          return await res.json();
        } catch {
          return null;
        }
      };

      const [wsData, filesData, jobsData] = await Promise.all([
        parseJsonSafe(wsRes),
        parseJsonSafe(filesRes),
        parseJsonSafe(jobsRes),
      ]);

      if (wsData?.success) {
        const payload = wsData.data ?? {};
        const rawWorkspace = payload.workspace ? payload.workspace : payload;
        const normalizedWorkspace = normalizeWorkspaceDetail(rawWorkspace);
        setWorkspace(normalizedWorkspace);
      } else if (!silent) {
        setWorkspace(null);
      }
      if (filesData?.success) {
        setFiles(normalizeFileItems(filesData.data));
      } else if (!silent) {
        setFiles([]);
      }
      if (jobsData?.success) {
        setJobs(normalizeJobs(jobsData.data));
      } else if (!silent) {
        setJobs([]);
      }
    } catch (err) {
      console.error("Failed to load workspace detail:", err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [params.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === "PENDING" || j.status === "RUNNING");
    if (!hasRunning) return;

    const interval = setInterval(() => {
      void loadData({ silent: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [jobs, loadData]);

  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === "PENDING" || j.status === "RUNNING");
    if (!hasRunning) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [jobs]);

  async function triggerGenerate(type: "code" | "thesis") {
    setGenerating(type);
    setGenerateMsg(null);
    const endpoints: Record<string, string> = {
      code: "generate-code",
      thesis: "generate-thesis",
    };
    const labels: Record<string, string> = {
      code: "代码生成",
      thesis: "论文生成",
    };

    try {
      const response = await fetch(`/api/workspace/${params.id}/${endpoints[type]}`, {
        method: "POST",
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            `${labels[type]}启动失败（HTTP ${response.status}），请稍后重试`
        );
      }

      const reservedPoints = Number(data?.data?.billing?.reservedPoints);
      const successText =
        type === "code" && Number.isFinite(reservedPoints) && reservedPoints > 0
          ? `${data?.data?.message || `${labels[type]}任务已提交`}，已冻结 ${reservedPoints.toLocaleString()} Token 点数，任务完成后按实际用量结算。`
          : data?.data?.message || `${labels[type]}任务已提交，正在排队处理`;

      setGenerateMsg({
        type: "success",
        text: successText,
      });
      await loadData({ silent: true });
    } catch (err) {
      setGenerateMsg({
        type: "error",
        text:
          err instanceof Error ? err.message : `${labels[type]}启动失败，请稍后重试`,
      });
    } finally {
      setGenerating(null);
    }
  }

  async function downloadFiles(type: "code" | "thesis" | "chart" | "all") {
    setDownloadingType(type);
    setDownloadMsg(null);
    try {
      const response = await fetch(`/api/workspace/${params.id}/download?type=${type}`);
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) {
        const errorData = contentType.includes("application/json")
          ? await response.json().catch(() => null)
          : null;
        throw new Error(errorData?.error || "下载失败，请稍后重试");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const fallbackFilename = `${workspace?.name || "workspace"}-${type}.zip`;
      const filename = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : fallbackFilename;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      setDownloadMsg({ type: "success", text: "下载已开始，请查看浏览器下载列表。" });
    } catch (downloadError) {
      const message =
        downloadError instanceof Error ? downloadError.message : "下载失败，请稍后重试";
      setDownloadMsg({ type: "error", text: message });
    } finally {
      setDownloadingType(null);
    }
  }

  async function confirmRequirements(action: "confirm" | "revise", userIdea?: string) {
    setConfirmingRequirements(true);
    setConfirmMsg(null);

    try {
      const res = await fetch(`/api/workspace/${params.id}/confirm-requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userIdea }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "功能确认失败");
      }

      setConfirmMsg({
        type: "success",
        text:
          action === "confirm"
            ? "功能范围已确认，并已完成难度评估"
            : "需求已按你的想法更新，并已完成难度评估",
      });
      setReviseDialogOpen(false);
      setReviseIdea("");
      await loadData({ silent: true });
    } catch (err) {
      setConfirmMsg({
        type: "error",
        text: err instanceof Error ? err.message : "功能确认失败，请稍后重试",
      });
    } finally {
      setConfirmingRequirements(false);
    }
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
  const majorModeLabel =
    workspace.requirements?.majorCategoryLabel ||
    (workspace.requirements?.majorCategory === "non-computer"
      ? "非计算机专业"
      : "计算机相关专业");
  const featureConfirmed = !!workspace.requirements?.featureConfirmed;
  const difficultyAssessment = workspace.requirements?.difficultyAssessment;
  const hasCodeFiles = files.some((f) => f.type === "CODE");
  const codeGenerationStarted =
    hasCodeFiles || jobs.some((j) => j.type === "CODE_GEN");
  const isCodeGenerating =
    generating === "code" ||
    jobs.some((j) => j.type === "CODE_GEN" && (j.status === "PENDING" || j.status === "RUNNING"));
  const hasRunningJob = jobs.some((j) => j.status === "PENDING" || j.status === "RUNNING");
  const operationLocked = generating !== null || hasRunningJob;
  const canGenerateCode = featureConfirmed && !operationLocked && !hasCodeFiles;
  const canGenerateThesis = hasCodeFiles && !isCodeGenerating && !operationLocked;
  const runningCodeJob = jobs.find(
    (j) => j.type === "CODE_GEN" && (j.status === "PENDING" || j.status === "RUNNING")
  );
  const runningCodeElapsedSeconds = runningCodeJob
    ? Math.max(0, Math.floor((nowMs - new Date(runningCodeJob.createdAt).getTime()) / 1000))
    : 0;
  const waitingCodeHint = runningCodeJob
    ? `步骤1进行中（${runningCodeJob.progress}% · 已运行 ${formatElapsed(
        runningCodeElapsedSeconds
      )}），完成后会自动解锁。`
    : "等待步骤1生成代码后解锁。";
  const backendStack = (workspace.techStack.backend || "").toLowerCase();
  const isJavaBackend = backendStack.includes("java");
  const isNodeBackend = backendStack.includes("node");
  const isPythonBackend = backendStack.includes("python");
  const isFlaskBackend = backendStack.includes("flask");
  const isDjangoBackend = backendStack.includes("django");
  const isFastapiBackend = backendStack.includes("fastapi");
  const codeFiles = files.filter((f) => f.type === "CODE");
  const thesisFiles = files.filter((f) => f.type === "THESIS");
  const chartFiles = files.filter((f) => f.type === "CHART");
  const templateFile = files.find(
    (f) => f.type === "CONFIG" && f.path.startsWith("templates/论文模板")
  );
  const hasThesisFiles = thesisFiles.length > 0;
  const hasChartFiles = chartFiles.length > 0;
  const hasAnyFiles = hasCodeFiles || hasThesisFiles || hasChartFiles;
  const backendCodeCount = codeFiles.filter((f) =>
    f.path.toLowerCase().startsWith("backend/")
  ).length;
  const frontendCodeCount = codeFiles.filter((f) =>
    f.path.toLowerCase().startsWith("frontend/")
  ).length;
  const sqlCodeCount = codeFiles.filter((f) => {
    const path = f.path.toLowerCase();
    return path.endsWith(".sql") || path.includes("/sql/");
  }).length;
  const otherCodeCount = Math.max(
    0,
    codeFiles.length - backendCodeCount - frontendCodeCount - sqlCodeCount
  );
  const currentPhase = hasCodeFiles ? 3 : featureConfirmed ? 2 : 1;
  const phaseItems = [
    {
      step: 1,
      title: "描述需求",
      description: "题目与功能范围已进入当前工作空间",
      state: "done" as const,
    },
    {
      step: 2,
      title: "AI确认需求",
      description: featureConfirmed ? "功能范围与难度评估已完成" : "等待你确认或补充修改意见",
      state: featureConfirmed ? ("done" as const) : currentPhase === 2 ? ("active" as const) : ("pending" as const),
    },
    {
      step: 3,
      title: "生成项目",
      description: hasCodeFiles
        ? "源码已生成，可浏览、下载并继续生成论文"
        : isCodeGenerating
          ? "代码生成中，完成后会自动更新交付区"
          : "点击生成项目代码后进入正式交付阶段",
      state: hasCodeFiles
        ? ("done" as const)
        : featureConfirmed
          ? ("active" as const)
          : ("pending" as const),
    },
  ];
  const systemCards = [
    !featureConfirmed
      ? {
          tone: "amber",
          title: "需求待确认",
          description: "先确认功能范围并完成难度评估，再启动项目代码生成。",
        }
      : null,
    featureConfirmed && !hasCodeFiles && !isCodeGenerating
      ? {
          tone: "blue",
          title: "需求已就绪，可以生成项目了",
          description: "这一步会冻结 Token 点数，任务完成后按实际用量结算，失败自动回退。",
        }
      : null,
    isCodeGenerating
      ? {
          tone: "blue",
          title: "代码生成中",
          description: runningCodeJob
            ? `当前进度 ${runningCodeJob.progress}% · 已运行 ${formatElapsed(runningCodeElapsedSeconds)}`
            : "系统正在整理项目目录与关键文件，请稍候。",
        }
      : null,
    hasCodeFiles
      ? {
          tone: "green",
          title: "源码已交付",
          description: "你现在可以浏览源码、下载完整项目，并继续生成毕业论文。",
        }
      : null,
  ].filter(Boolean) as Array<{ tone: string; title: string; description: string }>;

  const backendRunGuide = isJavaBackend
    ? `# 进入后端目录
cd backend

# 按实际情况修改数据库连接配置
# src/main/resources/application.yml

# 初始化数据库（如有 SQL）
mysql -u root -p your_database < sql/init.sql

# 启动后端
mvn spring-boot:run`
    : isNodeBackend
      ? `# 进入后端目录
cd backend

# 安装依赖
npm install

# 按实际情况修改 .env

# 启动后端
npm run dev`
      : isDjangoBackend
        ? `# 进入后端目录
cd backend

# 创建虚拟环境并激活
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 执行迁移并启动
python manage.py migrate
python manage.py runserver 0.0.0.0:8000`
        : isFlaskBackend
          ? `# 进入后端目录
cd backend

# 创建虚拟环境并激活
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动 Flask
flask --app app run --host 0.0.0.0 --port 8000`
          : isFastapiBackend
            ? `# 进入后端目录
cd backend

# 创建虚拟环境并激活
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动 FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
            : `# 进入后端目录
cd backend

# 根据 README 安装依赖并启动
# 如遇问题可在 AI 对话中粘贴报错信息继续排查`;

  const colorMap: Record<string, { bg: string; text: string; progressBg: string }> = {
    blue:   { bg: "bg-blue-100",   text: "text-blue-600",   progressBg: "bg-blue-500" },
    green:  { bg: "bg-green-100",  text: "text-green-600",  progressBg: "bg-green-500" },
    purple: { bg: "bg-purple-100", text: "text-purple-600", progressBg: "bg-purple-500" },
    amber:  { bg: "bg-amber-100",  text: "text-amber-600",  progressBg: "bg-amber-500" },
  };

  function getJobForType(jobType: string) {
    const typedJobs = jobs.filter((j) => j.type === jobType);
    if (typedJobs.length === 0) return undefined;

    return (
      typedJobs.find((j) => j.status === "PENDING" || j.status === "RUNNING") ||
      typedJobs[0]
    );
  }

  function renderStepCard({ step, color, title, desc, jobType, action, disabled, waitingHint }: {
    step: number;
    color: string;
    title: string;
    desc: string;
    jobType: string;
    action: React.ReactNode;
    disabled?: boolean;
    waitingHint?: string;
  }) {
    const c = colorMap[color] || colorMap.blue;
    const job = getJobForType(jobType);
    const jobResult =
      job?.result && typeof job.result === "object"
        ? (job.result as Record<string, unknown>)
        : {};
    const stageText =
      typeof jobResult.stage === "string" ? jobResult.stage : "";
    const detailText =
      typeof jobResult.detail === "string" ? jobResult.detail : "";
    const modelText =
      typeof jobResult.model === "string" ? jobResult.model : "";
    const isRunning = job?.status === "RUNNING" || job?.status === "PENDING";
    const isPending = job?.status === "PENDING";
    const isCompleted = job?.status === "COMPLETED";
    const isFailed = job?.status === "FAILED";
    const pendingTooLong =
      !!job &&
      isPending &&
      Date.now() - new Date(job.createdAt).getTime() > 30_000;
    const elapsedSeconds = job
      ? Math.max(0, Math.floor((nowMs - new Date(job.createdAt).getTime()) / 1000))
      : 0;
    const stageCandidates = jobStageHints[jobType] || jobStageHints.CODE_GEN;
    const syntheticStageIndex = Math.min(
      stageCandidates.length - 1,
      Math.max(0, Math.floor((job?.progress ?? 0) / (100 / stageCandidates.length)))
    );
    const spinningStageIndex =
      stageCandidates.length > 0 ? Math.floor(elapsedSeconds / 4) % stageCandidates.length : 0;
    const stageToShow =
      stageText || stageCandidates[Math.max(syntheticStageIndex, spinningStageIndex)] || "";

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
                {!!waitingHint && !isRunning && !isCompleted && !isFailed && (
                  <p className="text-[11px] text-muted-foreground mt-1">{waitingHint}</p>
                )}
              </div>
              {action}
            </div>
            {job && (isRunning || isFailed) && (
              <div className="mt-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {isRunning ? stageToShow || "正在生成中，请稍候..." : ""}
                  </span>
                  <span className="font-medium tabular-nums">{job.progress}%</span>
                </div>
                {isRunning && (
                  <div className="flex flex-wrap items-center gap-1">
                    {stageCandidates.map((hint, idx) => {
                      const active =
                        idx <= syntheticStageIndex ||
                        (!stageText && idx === spinningStageIndex);
                      return (
                        <span
                          key={`${jobType}-${idx}`}
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            active
                              ? "bg-blue-100 text-blue-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {hint}
                        </span>
                      );
                    })}
                  </div>
                )}
                {isRunning && detailText && (
                  <p className="text-[11px] text-muted-foreground">{detailText}</p>
                )}
                {isRunning && (
                  <p className="text-[11px] text-muted-foreground">
                    已运行 {formatElapsed(elapsedSeconds)} · 任务仍在执行，请勿刷新页面
                  </p>
                )}
                {pendingTooLong && (
                  <p className="text-[11px] text-amber-600">
                    任务排队时间较长，请确认后台 Worker 已启动（开发环境可执行 `pnpm worker:dev`）。
                  </p>
                )}
                {modelText && (
                  <p className="text-[11px] text-muted-foreground">模型: {modelText}</p>
                )}
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
    <div className="space-y-6 p-6 md:space-y-7 md:p-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_right_top,rgba(14,165,164,0.16),transparent_52%),radial-gradient(circle_at_left_bottom,rgba(249,115,22,0.12),transparent_42%)]" />
        <div className="relative flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/workspace")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{workspace.name}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{workspace.topic}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
        <div className="order-3 space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card className="border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">当前阶段</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                先明确需求，再进入生成与交付，不让次要信息抢走注意力。
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {phaseItems.map((item) => {
                const active = item.state === "active";
                const done = item.state === "done";
                return (
                  <div
                    key={item.step}
                    className={`rounded-2xl border p-4 ${
                      done
                        ? "border-emerald-200 bg-emerald-50/70"
                        : active
                          ? "border-primary/30 bg-primary/5"
                          : "border-border/70 bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          done
                            ? "bg-emerald-100 text-emerald-700"
                            : active
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? "✓" : item.step}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">工作台概览</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                这里只保留当前项目的必要背景，其他计费与支持信息移回对应页面。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Workspace
                </p>
                <p className="mt-2 text-sm font-medium leading-6">{workspace.topic}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant="outline"
                  className="text-xs border-blue-200 bg-blue-50 text-blue-700"
                >
                  专业模式: {majorModeLabel}
                </Badge>
                {Object.entries(workspace.techStack).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {value}
                  </Badge>
                ))}
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">当前状态</span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">需求确认</span>
                    <span className="font-medium">{featureConfirmed ? "已确认" : "待确认"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">源码交付</span>
                    <span className="font-medium">{hasCodeFiles ? "已生成" : "未生成"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">论文交付</span>
                    <span className="font-medium">{hasThesisFiles ? "已生成" : "未生成"}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => router.push("/showcase")}>
                <Play className="mr-2 h-4 w-4" />
                查看精选案例
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="order-2 space-y-6">
          {systemCards.length > 0 && (
            <div className="grid gap-3">
              {systemCards.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-2xl border px-4 py-3 ${
                    item.tone === "green"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : item.tone === "amber"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-blue-200 bg-blue-50 text-blue-800"
                  }`}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs opacity-90">{item.description}</p>
                </div>
              ))}
            </div>
          )}

          <Card className="border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">功能确认</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                先确认功能范围并完成难度评估，再进入正式交付阶段。
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {!featureConfirmed ? (
                <>
                  <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    当前尚未确认功能范围。你可以直接确认，或补充想法让 AI 先重分析。
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => confirmRequirements("confirm")}
                      disabled={confirmingRequirements || codeGenerationStarted}
                    >
                      {confirmingRequirements ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3 w-3" />
                      )}
                      确认当前功能
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReviseDialogOpen(true)}
                      disabled={confirmingRequirements || codeGenerationStarted}
                      className={codeGenerationStarted ? "hidden" : undefined}
                    >
                      <PencilLine className="mr-1.5 h-3 w-3" />
                      我要调整功能
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
                    功能范围已确认（
                    {workspace.requirements?.featureConfirmAction === "revise"
                      ? "AI 重分析后确认"
                      : "确认当前功能"}
                    ）
                    {workspace.requirements?.featureConfirmedAt
                      ? ` · ${new Date(workspace.requirements.featureConfirmedAt).toLocaleString("zh-CN")}`
                      : ""}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReviseDialogOpen(true)}
                    disabled={confirmingRequirements || codeGenerationStarted}
                    className={codeGenerationStarted ? "hidden" : undefined}
                  >
                    <PencilLine className="mr-1.5 h-3 w-3" />
                    重新调整并评估
                  </Button>
                </>
              )}

              {codeGenerationStarted && (
                <p className="text-xs text-muted-foreground">
                  代码生成已开始，功能范围已锁定，不能再调整并评估。
                </p>
              )}

              {confirmMsg && (
                <p className={`text-xs ${confirmMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                  {confirmMsg.text}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">生成与交付</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                运行预览已下线，当前核心交付为源码浏览、源码下载与论文生成。
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {generateMsg && (
                <div
                  className={`rounded-md border px-2.5 py-2 text-xs ${
                    generateMsg.type === "error"
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-green-200 bg-green-50 text-green-700"
                  }`}
                >
                  {generateMsg.text}
                </div>
              )}

              {generateMsg?.type === "error" &&
                /(Token|余额不足|充值)/i.test(generateMsg.text) && (
                  <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/billing")}>
                    前往充值后继续生成
                  </Button>
                )}

              {renderStepCard({
                step: 1,
                color: "blue",
                title: "生成项目代码",
                desc: "根据确认后的需求与技术栈生成完整源码；这一步会冻结 Token 点数，完成后按实际结算",
                jobType: "CODE_GEN",
                action: (
                  <Button
                    size="sm"
                    onClick={() => triggerGenerate("code")}
                    disabled={!canGenerateCode}
                    className="shrink-0"
                  >
                    {hasCodeFiles ? (
                      <CheckCircle2 className="mr-1.5 h-3 w-3" />
                    ) : generating === "code" ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <Code className="mr-1.5 h-3 w-3" />
                    )}
                    {hasCodeFiles ? "已生成" : "生成代码"}
                  </Button>
                ),
                waitingHint: !featureConfirmed
                  ? "请先完成上方“功能确认 + 难度评估”后再开始代码生成。"
                  : hasCodeFiles
                    ? "源码已生成，可继续浏览源码、下载交付物和生成论文。"
                    : undefined,
              })}

              {renderStepCard({
                step: 2,
                color: "green",
                title: "生成毕业论文",
                desc: "在源码基础上生成结构化论文初稿（含图表、目录与参考内容），供你按规范继续完善",
                jobType: "THESIS_GEN",
                action: (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerGenerate("thesis")}
                    disabled={!canGenerateThesis}
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
                waitingHint: !hasCodeFiles
                  ? waitingCodeHint
                  : isCodeGenerating
                    ? "步骤1进行中，暂不可启动论文生成。"
                    : undefined,
              })}

              {renderStepCard({
                step: 3,
                color: "amber",
                title: "浏览源码与下载交付",
                desc: "浏览 core/full 源码并打包下载当前项目文件；效果展示统一放到“精选案例”页",
                jobType: "PREVIEW",
                disabled: files.length === 0 || isCodeGenerating,
                action: (
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={files.length === 0 || isCodeGenerating}
                      onClick={() => setShowPreview(true)}
                    >
                      <Code className="mr-1.5 h-3 w-3" />
                      源码浏览
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={files.length === 0 || isCodeGenerating}
                      onClick={() => downloadFiles("all")}
                    >
                      <Download className="mr-1.5 h-3 w-3" />
                      下载全部
                    </Button>
                  </div>
                ),
                waitingHint: !hasCodeFiles ? waitingCodeHint : undefined,
              })}

              {hasCodeFiles ? (
                <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-600">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  有任何问题可以在下方 AI 对话中继续修改代码、讨论实现和补充细节。
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  生成项目代码后将解锁 AI 对话，你可以基于生成结果继续讨论与修改。
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">项目文件</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">源码、论文和图表会在这里集中交付</p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className={`flex items-center gap-3 rounded-lg border p-3 ${hasCodeFiles ? "border-blue-200 bg-blue-50/50" : "bg-muted/30"}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${hasCodeFiles ? "bg-blue-100" : "bg-gray-100"}`}>
                  <Package className={`h-5 w-5 ${hasCodeFiles ? "text-blue-600" : "text-gray-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">项目源代码</p>
                  <p className="text-xs text-muted-foreground">
                    {hasCodeFiles ? `${codeFiles.length} 个文件` : "尚未生成"}
                  </p>
                  {hasCodeFiles && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      后端 {backendCodeCount} · 前端 {frontendCodeCount} · SQL {sqlCodeCount}
                      {otherCodeCount > 0 ? ` · 其他 ${otherCodeCount}` : ""}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={hasCodeFiles ? "default" : "outline"}
                  disabled={!hasCodeFiles || downloadingType !== null}
                  className="shrink-0"
                  onClick={() => void downloadFiles("code")}
                >
                  {downloadingType === "code" ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-3 w-3" />
                  )}
                  下载
                </Button>
              </div>

              <div className={`flex items-center gap-3 rounded-lg border p-3 ${hasThesisFiles ? "border-green-200 bg-green-50/50" : "bg-muted/30"}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${hasThesisFiles ? "bg-green-100" : "bg-gray-100"}`}>
                  <BookOpen className={`h-5 w-5 ${hasThesisFiles ? "text-green-600" : "text-gray-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">毕业论文</p>
                  <p className="text-xs text-muted-foreground">
                    {hasThesisFiles ? `${thesisFiles.length} 个文件` : "尚未生成"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={hasThesisFiles ? "default" : "outline"}
                  disabled={!hasThesisFiles || downloadingType !== null}
                  className="shrink-0"
                  onClick={() => void downloadFiles("thesis")}
                >
                  {downloadingType === "thesis" ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-3 w-3" />
                  )}
                  下载
                </Button>
              </div>

              {hasChartFiles && (
                <div className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">图表文件</p>
                    <p className="text-xs text-muted-foreground">{chartFiles.length} 个文件</p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0"
                    disabled={downloadingType !== null}
                    onClick={() => void downloadFiles("chart")}
                  >
                    {downloadingType === "chart" ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="mr-1 h-3 w-3" />
                    )}
                    下载
                  </Button>
                </div>
              )}

              <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
                <p className="text-sm font-medium">论文模板（平台统一）</p>
                <p className="text-xs text-muted-foreground">
                  当前工作空间不再开放用户上传模板。平台会统一使用管理员后台启用的论文模板。
                </p>
                {templateFile && (
                  <p className="text-[11px] text-muted-foreground">
                    当前平台模板：{templateFile.path.split("/").pop()}
                  </p>
                )}
              </div>

              {downloadMsg && (
                <div
                  className={`rounded-md px-3 py-2 text-xs ${
                    downloadMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {downloadMsg.text}
                </div>
              )}

              {hasAnyFiles ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowGuide(true)}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  如何本地运行项目
                </Button>
              ) : (
                <div className="rounded-md bg-muted/50 px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground">点击上方“生成代码”或“生成论文”后</p>
                  <p className="text-xs text-muted-foreground">交付文件会显示在这里供你浏览和下载</p>
                </div>
              )}
            </CardContent>
          </Card>

          {hasCodeFiles ? (
            <Card className="flex h-[70vh] min-h-[560px] max-h-[860px] flex-col border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI 对话</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
                <ChatPanel
                  workspaceId={workspace.id}
                  files={files}
                  onFileApplied={loadData}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[220px] border-dashed border-white/70 bg-white/70 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI 对话（待解锁）</CardTitle>
              </CardHeader>
              <CardContent className="flex h-full items-center justify-center">
                <div className="max-w-md space-y-2 text-center">
                  <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    先完成“生成项目代码”，再在这里让 AI 帮你讨论细节、修改功能和调整实现。
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="order-1 space-y-6 xl:col-span-2">
          <Card className="border-white/70 bg-white/85 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.45)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">需求文档</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                这里固定展示当前工作空间的需求摘要、角色、模块、表结构和难度评估。
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {workspace.requirements.summary && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-blue-700">项目概览</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {workspace.requirements.summary}
                  </p>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">用户角色</span>
                  <Badge variant="secondary" className="text-xs">
                    {workspace.requirements.roles?.length ?? 0} 个角色
                  </Badge>
                </div>
                <div className="space-y-2">
                  {(workspace.requirements.roles ?? []).map((role, i) => (
                    <div key={i} className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-sm font-medium">{role.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">功能模块</span>
                  <Badge variant="secondary" className="text-xs">
                    {workspace.requirements.modules?.length ?? 0} 个模块
                  </Badge>
                </div>
                <div className="space-y-2">
                  {(workspace.requirements.modules ?? []).map((mod, i) => (
                    <details key={i} className="group rounded-xl border bg-muted/20">
                      <summary className="flex cursor-pointer items-center gap-2 p-3 text-sm font-medium list-none">
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
                        {mod.name}
                        <Badge variant="outline" className="ml-auto text-xs">
                          {mod.features.length} 项功能
                        </Badge>
                      </summary>
                      <div className="px-3 pb-3">
                        <ul className="ml-5 space-y-1">
                          {mod.features.map((feat, j) => (
                            <li key={j} className="list-disc text-xs text-muted-foreground">
                              {feat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">数据库表</span>
                  <Badge variant="secondary" className="text-xs">
                    {workspace.requirements.tables?.length ?? 0} 张表
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(workspace.requirements.tables ?? []).map((table, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono">
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">规模评估</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-muted/30 px-3 py-2">预计页面：{workspace.requirements.estimatedPages ?? 0}</div>
                  <div className="rounded-xl bg-muted/30 px-3 py-2">预计接口：{workspace.requirements.estimatedApis ?? 0}</div>
                  <div className="rounded-xl bg-muted/30 px-3 py-2">预计表数：{workspace.requirements.estimatedTables ?? 0}</div>
                  <div className="rounded-xl bg-muted/30 px-3 py-2">预计字数：{workspace.requirements.estimatedWords ?? 0}</div>
                </div>
              </div>

              {difficultyAssessment && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium">难度评估</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-muted/30 px-3 py-2">学术性：{difficultyAssessment.academic}</div>
                      <div className="rounded-xl bg-muted/30 px-3 py-2">实用性：{difficultyAssessment.practical}</div>
                      <div className="rounded-xl bg-muted/30 px-3 py-2">技术难度：{difficultyAssessment.difficulty}</div>
                      <div className="rounded-xl bg-muted/30 px-3 py-2">创新性：{difficultyAssessment.innovation}</div>
                      <div className="rounded-xl bg-muted/30 px-3 py-2">综合分：{difficultyAssessment.overall}</div>
                      <div className="rounded-xl bg-muted/30 px-3 py-2">工作量：{difficultyAssessment.workload}</div>
                    </div>
                    {difficultyAssessment.suggestions?.length > 0 && (
                      <div className="rounded-xl border bg-muted/20 p-3">
                        <p className="text-xs font-medium text-foreground">建议</p>
                        <ul className="mt-2 ml-5 space-y-1">
                          {difficultyAssessment.suggestions.slice(0, 4).map((tip, idx) => (
                            <li key={idx} className="list-disc text-xs text-muted-foreground">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={reviseDialogOpen} onOpenChange={setReviseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>调整功能范围</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              直接写你的想法即可，例如：增加角色、增加模块、最少表数量、指定关键流程等。
            </p>
            <Textarea
              value={reviseIdea}
              onChange={(e) => setReviseIdea(e.target.value)}
              placeholder="例如：再加一个“审核员”角色；订单模块增加退款审核；数据库至少 8 张表。"
              className="min-h-[140px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setReviseDialogOpen(false)}
                disabled={confirmingRequirements}
              >
                取消
              </Button>
              <Button
                onClick={() => confirmRequirements("revise", reviseIdea)}
                disabled={confirmingRequirements || codeGenerationStarted || !reviseIdea.trim()}
              >
                {confirmingRequirements ? (
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <PencilLine className="mr-1.5 h-3 w-3" />
                )}
                AI 分析并确认功能
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                {isJavaBackend && (
                  <>
                    <p>• 安装 <strong className="text-foreground">JDK 17+</strong>（推荐从 <a href="https://adoptium.net" target="_blank" className="text-blue-500 underline">adoptium.net</a> 下载）</p>
                    <p>• 安装 <strong className="text-foreground">Maven 3.8+</strong> 或使用项目自带的 mvnw</p>
                  </>
                )}
                {isNodeBackend && (
                  <p>• 安装 <strong className="text-foreground">Node.js 18+</strong>（推荐从 <a href="https://nodejs.org" target="_blank" className="text-blue-500 underline">nodejs.org</a> 下载）</p>
                )}
                {isPythonBackend && (
                  <>
                    <p>• 安装 <strong className="text-foreground">Python 3.10+</strong>（建议启用 pip/venv）</p>
                    <p>• 安装 <strong className="text-foreground">pip</strong>，并建议使用虚拟环境隔离依赖</p>
                  </>
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
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">解压项目源代码，进入后端目录：</p>
                <pre className="rounded-md bg-gray-900 text-gray-100 p-3 text-xs overflow-x-auto">
{backendRunGuide}
                </pre>
              </div>
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
                如果本地部署遇到困难，可以联系客服提供<strong>远程部署服务</strong>，协助你完成环境部署。
                也可以在工作空间的 AI 对话中描述你的报错信息，AI 会辅助你定位问题。
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
