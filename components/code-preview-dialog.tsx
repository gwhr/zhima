"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Code,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  FolderOpen,
  Download,
  ExternalLink,
  Info,
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
  };
  return langMap[ext] || "text";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
  const router = useRouter();
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

  const codeFiles = useMemo(() => files.filter((f) => f.type === "CODE"), [files]);
  const scopedCodeFiles = useMemo(
    () => filterCodeFilesByScope(codeFiles, fileScope),
    [codeFiles, fileScope]
  );
  const coreCodeCount = useMemo(
    () => filterCodeFilesByScope(codeFiles, "core").length,
    [codeFiles]
  );
  const scopeSummaryText = useMemo(
    () => `${scopedCodeFiles.length}/${codeFiles.length} 个代码文件`,
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
    ],
    [
      backendCodeFiles,
      frontendCodeFiles,
      sqlCodeFiles,
      docsCodeFiles,
      otherCodeFiles,
    ]
  );

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
      setFileActionMsg(null);
      setCopied(false);
    }
  }, [open]);

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

  const selectedFile = selectableFiles.find((f) => f.id === selectedFileId) || null;

  function renderFileGroup(label: string, items: FileItem[]) {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <FolderOpen className="h-3 w-3" />
          {label}
        </div>
        <div className="space-y-1">
          {items.map((file) => {
            const active = selectedFileId === file.id;
            const isCore = isCoreCodeFilePath(file.path);
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => handleSelectFile(file)}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left transition-all",
                  active
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-transparent bg-white/60 hover:border-border/70 hover:bg-muted/40"
                )}
              >
                <div className="flex items-start gap-2">
                  <Code className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-medium">{file.path}</p>
                      {isCore && (
                        <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">
                          核心
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatSize(file.size)}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-w-6xl flex-col overflow-hidden border-white/70 bg-white/90 p-0 backdrop-blur-xl">
        <DialogHeader className="border-b border-white/70 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <DialogTitle className="text-xl">源码浏览</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                当前工作空间不再提供运行预览；这里用于查看生成源码，效果参考请前往精选案例。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/showcase");
                }}
              >
                <ExternalLink className="mr-1.5 h-4 w-4" />
                查看精选案例
              </Button>
              <Button
                type="button"
                onClick={() => void handleDownloadByScope()}
                disabled={downloadingScope || scopedCodeFiles.length === 0}
              >
                {downloadingScope ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" />
                )}
                下载{fileScope === "core" ? "核心源码" : "全量源码"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="border-b border-white/70 bg-muted/20 px-6 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">源码范围</Badge>
              <span>{scopeSummaryText}</span>
              <span>核心文件 {coreCodeCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={fileScope === "core" ? "default" : "outline"}
                onClick={() => setFileScope("core")}
              >
                核心源码
              </Button>
              <Button
                type="button"
                size="sm"
                variant={fileScope === "full" ? "default" : "outline"}
                onClick={() => setFileScope("full")}
              >
                全量源码
              </Button>
            </div>
          </div>
          {fileActionMsg && (
            <p
              className={cn(
                "mt-2 text-xs",
                fileActionMsg.type === "success" ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {fileActionMsg.text}
            </p>
          )}
        </div>

        {codeFiles.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
            <div className="max-w-md space-y-3">
              <Info className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-base font-medium">还没有可浏览的源码</p>
              <p className="text-sm text-muted-foreground">
                请先在工作空间点击“生成项目代码”，生成完成后即可在这里浏览 `core/full` 两种源码范围。
              </p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 lg:grid-cols-[300px,minmax(0,1fr)]">
            <div className="border-r border-white/70 bg-muted/15">
              <ScrollArea className="h-full px-3 py-4">
                {renderFileGroup("后端", backendCodeFiles)}
                {renderFileGroup("前端", frontendCodeFiles)}
                {renderFileGroup("SQL", sqlCodeFiles)}
                {renderFileGroup("文档", docsCodeFiles)}
                {renderFileGroup("其他", otherCodeFiles)}
              </ScrollArea>
            </div>

            <div className="min-h-0 bg-slate-950 text-slate-100">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {selectedFile?.path || "请选择左侧文件"}
                  </p>
                  {selectedFile && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {getLanguage(selectedFile.path)} · {formatSize(selectedFile.size)}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!fileContent || loadingContent}
                  className="text-slate-200 hover:bg-white/10 hover:text-white"
                  onClick={() => void handleCopy()}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {contentPreviewNotice && (
                <div
                  className={cn(
                    "border-b px-4 py-2 text-xs",
                    contentPreviewLimited
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                  )}
                >
                  {contentPreviewNotice}
                </div>
              )}

              <ScrollArea className="h-[calc(88vh-226px)]">
                {loadingContent ? (
                  <div className="flex h-full items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : selectedFile ? (
                  <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-100">
                    <code>{fileContent}</code>
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center px-6 py-16 text-center text-sm text-slate-400">
                    选择左侧文件查看内容
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
