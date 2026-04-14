"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Code,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  FolderOpen,
  Play,
  Download,
  MonitorSmartphone,
  RefreshCw,
  Info,
  Timer,
  Rocket,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  filterCodeFilesByScope,
  type SourceScope,
  isCoreCodeFilePath,
} from "@/lib/file-preview-scope";

interface FileItem {
  id: string;
  path: string;
  type: string;
  size: number;
}

interface RuntimePreviewJobView {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  stage: string | null;
  detail: string | null;
  queuePosition: number;
  queueTotal: number;
  sessionStartedAt: string | null;
  sessionExpiresAt: string | null;
  remainingSeconds: number;
  previewUrl: string | null;
  createdAt: string;
}

interface RuntimePreviewStatusView {
  runtimeSeconds: number;
  maxConcurrent: number;
  queuePending: number;
  queueRunning: number;
  hasCodeFiles: boolean;
  hasRecharge: boolean;
  freeTrialLimit: number | null;
  freeTrialUsed: number;
  freeTrialRemaining: number | null;
  canStart: boolean;
  blockedReason: string | null;
  currentJob: RuntimePreviewJobView | null;
  accepted?: boolean;
  message?: string;
}

interface CodePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  files: FileItem[];
}

function getLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    java: "java",
    js: "javascript",
    ts: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    vue: "vue",
    html: "html",
    css: "css",
    xml: "xml",
    yml: "yaml",
    yaml: "yaml",
    json: "json",
    sql: "sql",
    md: "markdown",
    py: "python",
    properties: "properties",
    txt: "text",
    text: "text",
    plaintext: "text",
  };
  return langMap[ext] || "text";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatCountdown(seconds: number) {
  const safe = Math.max(0, seconds);
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}m ${String(sec).padStart(2, "0")}s`;
}

function classifyCodeFile(
  filePath: string
): "backend" | "frontend" | "sql" | "docs" | "other" {
  const path = filePath.toLowerCase();
  if (path.endsWith(".sql") || path.includes("/sql/") || path.startsWith("sql/")) {
    return "sql";
  }
  if (path.startsWith("backend/")) return "backend";
  if (path.startsWith("frontend/")) return "frontend";
  if (path.startsWith("docs/") || path.endsWith(".md")) return "docs";
  return "other";
}

export function CodePreviewDialog({
  open,
  onOpenChange,
  workspaceId,
  files,
}: CodePreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<"files" | "preview">("preview");
  const [fileScope, setFileScope] = useState<SourceScope>("core");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [contentPreviewLimited, setContentPreviewLimited] = useState(false);
  const [contentPreviewNotice, setContentPreviewNotice] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingScope, setDownloadingScope] = useState(false);
  const [fileActionMsg, setFileActionMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);

  const [runtimeStatus, setRuntimeStatus] = useState<RuntimePreviewStatusView | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [runtimeStarting, setRuntimeStarting] = useState(false);
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const codeFiles = useMemo(() => files.filter((f) => f.type === "CODE"), [files]);
  const thesisFiles = useMemo(() => files.filter((f) => f.type === "THESIS"), [files]);
  const chartFiles = useMemo(() => files.filter((f) => f.type === "CHART"), [files]);
  const scopedCodeFiles = useMemo(
    () => filterCodeFilesByScope(codeFiles, fileScope),
    [codeFiles, fileScope]
  );
  const coreCodeCount = useMemo(
    () => filterCodeFilesByScope(codeFiles, "core").length,
    [codeFiles]
  );
  const scopeSummaryText = useMemo(
    () => `${scopedCodeFiles.length}/${codeFiles.length} code files`,
    [scopedCodeFiles.length, codeFiles.length]
  );

  const backendCodeFiles = useMemo(
    () => scopedCodeFiles.filter((f) => classifyCodeFile(f.path) === "backend"),
    [scopedCodeFiles]
  );
  const frontendCodeFiles = useMemo(
    () => scopedCodeFiles.filter((f) => classifyCodeFile(f.path) === "frontend"),
    [scopedCodeFiles]
  );
  const sqlCodeFiles = useMemo(
    () => scopedCodeFiles.filter((f) => classifyCodeFile(f.path) === "sql"),
    [scopedCodeFiles]
  );
  const docsCodeFiles = useMemo(
    () => scopedCodeFiles.filter((f) => classifyCodeFile(f.path) === "docs"),
    [scopedCodeFiles]
  );
  const otherCodeFiles = useMemo(
    () => scopedCodeFiles.filter((f) => classifyCodeFile(f.path) === "other"),
    [scopedCodeFiles]
  );
  const selectableFiles = useMemo(
    () => [
      ...backendCodeFiles,
      ...frontendCodeFiles,
      ...sqlCodeFiles,
      ...docsCodeFiles,
      ...otherCodeFiles,
      ...thesisFiles,
      ...chartFiles,
    ],
    [
      backendCodeFiles,
      frontendCodeFiles,
      sqlCodeFiles,
      docsCodeFiles,
      otherCodeFiles,
      thesisFiles,
      chartFiles,
    ]
  );

  const runtimeJob = runtimeStatus?.currentJob ?? null;
  const runtimeActive = runtimeJob?.status === "PENDING" || runtimeJob?.status === "RUNNING";

  const runtimeIframeSrc = useMemo(() => {
    if (runtimeJob && runtimeActive) {
      return `/api/workspace/${workspaceId}/preview-build?runtime=1&jobId=${runtimeJob.id}`;
    }
    return `/api/workspace/${workspaceId}/preview-build`;
  }, [runtimeActive, runtimeJob, workspaceId]);

  const loadFileContent = useCallback(
    async (fileId: string) => {
      setLoadingContent(true);
      setFileContent("");
      setContentPreviewLimited(false);
      setContentPreviewNotice(null);
      try {
        const res = await fetch(`/api/workspace/${workspaceId}/files/${fileId}`);
        const data = await res.json();
        if (data?.success) {
          const payload = data.data ?? {};
          setFileContent(typeof payload.content === "string" ? payload.content : "");
          setContentPreviewLimited(Boolean(payload.previewLimited));
          setContentPreviewNotice(
            typeof payload.previewNotice === "string" && payload.previewNotice.trim()
              ? payload.previewNotice
              : null
          );
        } else {
          setFileContent("[加载失败]");
        }
      } catch {
        setFileContent("[网络错误]");
        setContentPreviewLimited(false);
        setContentPreviewNotice(null);
      }
      setLoadingContent(false);
    },
    [workspaceId]
  );

  const loadRuntimeStatus = useCallback(
    async (silent = false) => {
      if (!silent) setRuntimeLoading(true);
      try {
        const res = await fetch(`/api/workspace/${workspaceId}/runtime-preview`);
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success) {
          throw new Error(result?.error || "运行预览状态获取失败");
        }
        setRuntimeStatus(result.data as RuntimePreviewStatusView);
        setRuntimeMessage(null);
        setRuntimeError(null);
      } catch (err) {
        setRuntimeError(err instanceof Error ? err.message : "运行预览状态获取失败");
      } finally {
        if (!silent) setRuntimeLoading(false);
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    if (!open) return;
    if (selectableFiles.length === 0) {
      setSelectedFileId(null);
      setFileContent("");
      setContentPreviewLimited(false);
      setContentPreviewNotice(null);
      return;
    }

    const stillSelected =
      selectedFileId && selectableFiles.some((file) => file.id === selectedFileId);
    if (!stillSelected) {
      const first = selectableFiles[0];
      setSelectedFileId(first.id);
      void loadFileContent(first.id);
    }
  }, [open, selectableFiles, selectedFileId, loadFileContent]);

  useEffect(() => {
    if (!open) {
      setSelectedFileId(null);
      setFileContent("");
      setContentPreviewLimited(false);
      setContentPreviewNotice(null);
      setRuntimeMessage(null);
      setRuntimeError(null);
      setRuntimeStatus(null);
      return;
    }
    if (activeTab === "preview") {
      setPreviewLoading(true);
      void loadRuntimeStatus();
    }
  }, [open, activeTab, loadRuntimeStatus]);

  useEffect(() => {
    if (!open || activeTab !== "preview") return;
    const timer = setInterval(() => {
      void loadRuntimeStatus(true);
    }, 2000);
    return () => clearInterval(timer);
  }, [open, activeTab, loadRuntimeStatus]);

  useEffect(() => {
    setPreviewLoading(true);
  }, [runtimeIframeSrc, previewKey]);

  useEffect(() => {
    if (!fileActionMsg) return;
    const timer = setTimeout(() => setFileActionMsg(null), 3500);
    return () => clearTimeout(timer);
  }, [fileActionMsg]);

  function handleSelectFile(file: FileItem) {
    setSelectedFileId(file.id);
    void loadFileContent(file.id);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadByScope() {
    setDownloadingScope(true);
    setFileActionMsg(null);
    try {
      const res = await fetch(
        `/api/workspace/${workspaceId}/download?type=code&scope=${fileScope}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "下载失败，请稍后重试");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const filename = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : `project_code_${fileScope}.zip`;
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      setFileActionMsg({
        type: "success",
        text: fileScope === "core" ? "核心源码下载已开始" : "全量源码下载已开始",
      });
    } catch (err) {
      setFileActionMsg({
        type: "error",
        text: err instanceof Error ? err.message : "下载失败，请稍后重试",
      });
    } finally {
      setDownloadingScope(false);
    }
  }

  async function handleStartRuntimePreview() {
    setRuntimeStarting(true);
    setRuntimeError(null);
    setRuntimeMessage(null);
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/runtime-preview`, {
        method: "POST",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "启动运行预览失败");
      }

      const data = result.data as RuntimePreviewStatusView;
      setRuntimeStatus(data);
      if (data.message) setRuntimeMessage(data.message);
      setPreviewKey((k) => k + 1);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err.message : "启动运行预览失败");
    } finally {
      setRuntimeStarting(false);
    }
  }

  const selectedFile = selectableFiles.find((f) => f.id === selectedFileId) || null;

  function renderFileGroup(label: string, items: FileItem[], icon: typeof Code) {
    if (items.length === 0) return null;
    const Icon = icon;
    return (
      <div className="mb-3">
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <Icon className="h-3 w-3" />
          {label}
          <Badge variant="secondary" className="text-[10px] ml-auto h-4 px-1">
            {items.length}
          </Badge>
        </div>
        {items.map((file) => (
          <button
            key={file.id}
            onClick={() => handleSelectFile(file)}
            className={cn(
              "w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 group",
              selectedFileId === file.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 shrink-0 transition-transform",
                selectedFileId === file.id && "rotate-90"
              )}
            />
            <span className="truncate flex-1 font-mono">{file.path}</span>
            {fileScope === "full" && file.type === "CODE" && isCoreCodeFilePath(file.path) && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] shrink-0 h-4 px-1",
                  selectedFileId === file.id && "bg-white/20 text-primary-foreground"
                )}
              >
                核心
              </Badge>
            )}
            <span
              className={cn(
                "text-[10px] shrink-0",
                selectedFileId === file.id
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              )}
            >
              {formatSize(file.size)}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[96vw] !w-[96vw] !h-[93vh] !max-h-[93vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-4 w-4" />
              项目预览
              <Badge variant="secondary" className="text-xs">
                {files.length} 个文件
              </Badge>
            </DialogTitle>
            <div className="flex items-center bg-muted rounded-lg p-0.5 mr-8">
              <button
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeTab === "preview"
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Play className="h-3 w-3" />
                运行预览
              </button>
              <button
                onClick={() => setActiveTab("files")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeTab === "files"
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Code className="h-3 w-3" />
                文件浏览
              </button>
            </div>
          </div>
        </DialogHeader>

        {activeTab === "files" ? (
          <div className="flex flex-1 min-h-0 flex-col">
            <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">源码范围</span>
                  <div className="inline-flex items-center rounded-lg border bg-white p-0.5">
                    <button
                      type="button"
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-md transition-colors",
                        fileScope === "core"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setFileScope("core")}
                    >
                      核心
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-md transition-colors",
                        fileScope === "full"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setFileScope("full")}
                    >
                      全量
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">{scopeSummaryText}</span>
                  {fileScope === "core" && (
                    <Badge variant="outline" className="text-[10px]">
                      核心文件 {coreCodeCount}
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => void handleDownloadByScope()}
                  disabled={downloadingScope || codeFiles.length === 0}
                >
                  {downloadingScope ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-3 w-3" />
                  )}
                  下载{fileScope === "core" ? "核心源码" : "全量源码"}
                </Button>
              </div>
              {fileActionMsg && (
                <div
                  className={cn(
                    "mt-2 rounded-md border px-2.5 py-1.5 text-xs",
                    fileActionMsg.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  )}
                >
                  {fileActionMsg.text}
                </div>
              )}
            </div>
            <div className="flex flex-1 min-h-0">
              <div className="w-56 border-r shrink-0 overflow-y-auto p-2">
                {renderFileGroup("后端文件", backendCodeFiles, Code)}
                {renderFileGroup("前端文件", frontendCodeFiles, Code)}
                {renderFileGroup("SQL 脚本", sqlCodeFiles, Code)}
                {renderFileGroup("文档说明", docsCodeFiles, FileText)}
                {renderFileGroup("其他代码", otherCodeFiles, Code)}
                {renderFileGroup("论文", thesisFiles, FileText)}
                {renderFileGroup("图表", chartFiles, FileText)}
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                {selectedFile && (
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="text-xs font-mono truncate">{selectedFile.path}</code>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {getLanguage(selectedFile.path)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={handleCopy}
                      disabled={!fileContent || loadingContent}
                    >
                      {copied ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3 w-3" />
                          复制
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {contentPreviewNotice && (
                  <div
                    className={cn(
                      "mx-3 mt-3 mb-1 rounded-md border px-3 py-2 text-xs shrink-0",
                      contentPreviewLimited
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                    )}
                  >
                    {contentPreviewNotice}
                  </div>
                )}
                <ScrollArea className="flex-1">
                  {loadingContent ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
                      {fileContent || "选择左侧文件查看内容"}
                    </pre>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-muted/30 shrink-0 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MonitorSmartphone className="h-3.5 w-3.5" />
                  <span>运行预览（可排队，限时会话）</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => void loadRuntimeStatus()}
                    disabled={runtimeLoading || runtimeStarting}
                  >
                    <RefreshCw className={cn("mr-1 h-3 w-3", runtimeLoading && "animate-spin")} />
                    刷新状态
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => void handleStartRuntimePreview()}
                    disabled={
                      runtimeStarting ||
                      runtimeLoading ||
                      !runtimeStatus?.hasCodeFiles ||
                      (!!runtimeJob && runtimeActive) ||
                      (!runtimeStatus?.canStart && !runtimeActive)
                    }
                  >
                    {runtimeStarting ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Rocket className="mr-1 h-3 w-3" />
                    )}
                    {runtimeJob?.status === "RUNNING"
                      ? "运行中"
                      : runtimeJob?.status === "PENDING"
                      ? "排队中"
                      : "启动运行预览"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                <div className="rounded-md border bg-white px-2.5 py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">并发上限</span>
                  <span className="font-medium">
                    {runtimeStatus?.queueRunning ?? 0}/{runtimeStatus?.maxConcurrent ?? 1}
                  </span>
                </div>
                <div className="rounded-md border bg-white px-2.5 py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">排队人数</span>
                  <span className="font-medium">{runtimeStatus?.queuePending ?? 0}</span>
                </div>
                <div className="rounded-md border bg-white px-2.5 py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">单次时长</span>
                  <span className="font-medium">
                    {Math.max(1, Math.ceil((runtimeStatus?.runtimeSeconds ?? 0) / 60))} 分钟
                  </span>
                </div>
                <div className="rounded-md border bg-white px-2.5 py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">免费次数</span>
                  <span className="font-medium">
                    {runtimeStatus?.freeTrialLimit === null
                      ? "无限制"
                      : `${runtimeStatus?.freeTrialRemaining ?? 0}/${runtimeStatus?.freeTrialLimit ?? 0}`}
                  </span>
                </div>
              </div>

              {runtimeJob && (
                <div
                  className={cn(
                    "rounded-md border px-3 py-2 text-xs",
                    runtimeJob.status === "RUNNING"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : runtimeJob.status === "PENDING"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {runtimeJob.status === "RUNNING" ? (
                      <>
                        <Timer className="h-3.5 w-3.5" />
                        正在运行 · 剩余 {formatCountdown(runtimeJob.remainingSeconds)}
                      </>
                    ) : runtimeJob.status === "PENDING" ? (
                      <>
                        <Users className="h-3.5 w-3.5" />
                        排队中 · 当前第 {runtimeJob.queuePosition} 位（共 {runtimeJob.queueTotal}）
                      </>
                    ) : (
                      "上次运行会话已结束"
                    )}
                  </div>
                  {(runtimeJob.stage || runtimeJob.detail) && (
                    <p className="mt-1 leading-relaxed opacity-90">
                      {[runtimeJob.stage, runtimeJob.detail].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              )}

              {runtimeMessage && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {runtimeMessage}
                </div>
              )}

              {runtimeStatus?.blockedReason && !runtimeActive && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {runtimeStatus.blockedReason}
                </div>
              )}

              {runtimeError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {runtimeError}
                </div>
              )}
            </div>

            <div className="flex-1 relative">
              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    <p className="text-sm text-muted-foreground">正在加载预览...</p>
                  </div>
                </div>
              )}
              <iframe
                key={`${runtimeIframeSrc}:${previewKey}`}
                src={runtimeIframeSrc}
                className="w-full h-full border-0"
                sandbox="allow-scripts"
                onLoad={() => setPreviewLoading(false)}
                title="项目运行预览"
              />
            </div>

            <div className="shrink-0 border-t bg-blue-50/80 px-4 py-2.5 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700/80 leading-relaxed">
                运行预览用于给小白用户快速看到效果。为保障共享资源，系统会做并发排队与限时回收。若要长期运行，
                请下载完整代码到本地或服务器部署。
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
