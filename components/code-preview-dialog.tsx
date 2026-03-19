"use client";

import { useEffect, useState, useCallback } from "react";
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
  MonitorSmartphone,
  RefreshCw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    java: "java", js: "javascript", ts: "typescript", tsx: "typescript",
    jsx: "javascript", vue: "vue", html: "html", css: "css", xml: "xml",
    yml: "yaml", yaml: "yaml", json: "json", sql: "sql", md: "markdown",
    py: "python", properties: "properties", txt: "text", text: "text",
    plaintext: "text",
  };
  return langMap[ext] || "text";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CodePreviewDialog({
  open,
  onOpenChange,
  workspaceId,
  files,
}: CodePreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<"files" | "preview">("preview");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);

  const codeFiles = files.filter((f) => f.type === "CODE");
  const thesisFiles = files.filter((f) => f.type === "THESIS");
  const chartFiles = files.filter((f) => f.type === "CHART");

  const loadFileContent = useCallback(
    async (fileId: string) => {
      setLoadingContent(true);
      setFileContent("");
      try {
        const res = await fetch(`/api/workspace/${workspaceId}/files/${fileId}`);
        const data = await res.json();
        setFileContent(data.success ? data.data.content : "[加载失败]");
      } catch {
        setFileContent("[网络错误]");
      }
      setLoadingContent(false);
    },
    [workspaceId]
  );

  useEffect(() => {
    if (open && files.length > 0 && !selectedFileId) {
      const first = codeFiles[0] || files[0];
      setSelectedFileId(first.id);
      loadFileContent(first.id);
    }
  }, [open, files, selectedFileId, codeFiles, loadFileContent]);

  useEffect(() => {
    if (!open) {
      setSelectedFileId(null);
      setFileContent("");
    }
  }, [open]);

  useEffect(() => {
    if (open && activeTab === "preview") {
      setPreviewLoading(true);
    }
  }, [open, activeTab]);

  function handleSelectFile(file: FileItem) {
    setSelectedFileId(file.id);
    loadFileContent(file.id);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedFile = files.find((f) => f.id === selectedFileId);

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
          <div className="flex flex-1 min-h-0">
            <div className="w-56 border-r shrink-0 overflow-y-auto p-2">
              {renderFileGroup("源代码", codeFiles, Code)}
              {renderFileGroup("论文", thesisFiles, FileText)}
              {renderFileGroup("图表", chartFiles, FileText)}
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              {selectedFile && (
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-xs font-mono truncate">
                      {selectedFile.path}
                    </code>
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
                      <><Check className="mr-1 h-3 w-3" /> 已复制</>
                    ) : (
                      <><Copy className="mr-1 h-3 w-3" /> 复制</>
                    )}
                  </Button>
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
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MonitorSmartphone className="h-3.5 w-3.5" />
                <span>项目界面效果预览 · 展示完整交互流程与页面布局</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setPreviewLoading(true);
                  setPreviewKey((k) => k + 1);
                }}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                刷新
              </Button>
            </div>
            <div className="flex-1 relative">
              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    <p className="text-sm text-muted-foreground">正在构建预览...</p>
                  </div>
                </div>
              )}
              <iframe
                key={previewKey}
                src={`/api/workspace/${workspaceId}/preview-build`}
                className="w-full h-full border-0"
                sandbox="allow-scripts"
                onLoad={() => setPreviewLoading(false)}
                title="项目运行预览"
              />
            </div>
            <div className="shrink-0 border-t bg-blue-50/80 px-4 py-2.5 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700/80 leading-relaxed">
                当前为界面效果演示，使用预置示例数据呈现系统完整功能与交互流程。下载项目后，按照本地部署指南完成数据库初始化，系统将自动连接您配置的真实数据源。
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
