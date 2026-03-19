"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Copy,
  FileCode,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseAiResponse,
  findMatchingFile,
  type ParsedSegment,
} from "@/lib/parse-ai-code-blocks";

interface FileItem {
  id: string;
  path: string;
  type: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  workspaceId: string;
  files: FileItem[];
  onFileApplied?: () => void;
}

function TextBlock({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        if (trimmed.startsWith("### ")) {
          return (
            <p key={i} className="font-semibold text-sm mt-2">
              {trimmed.slice(4)}
            </p>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <p key={i} className="font-bold text-sm mt-2">
              {trimmed.slice(3)}
            </p>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <p key={i} className="font-bold text-base mt-2">
              {trimmed.slice(2)}
            </p>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <p key={i} className="pl-3 text-sm">
              • {renderInlineCode(trimmed.slice(2))}
            </p>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\.\s/)?.[1];
          return (
            <p key={i} className="pl-3 text-sm">
              {num}. {renderInlineCode(trimmed.replace(/^\d+\.\s/, ""))}
            </p>
          );
        }

        return (
          <p key={i} className="text-sm">
            {renderInlineCode(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 rounded bg-gray-200 text-gray-800 text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, j) => {
      if (bp.startsWith("**") && bp.endsWith("**")) {
        return (
          <strong key={`${i}-${j}`} className="font-semibold">
            {bp.slice(2, -2)}
          </strong>
        );
      }
      return <span key={`${i}-${j}`}>{bp}</span>;
    });
  });
}

function CodeBlock({
  segment,
  workspaceId,
  files,
  onFileApplied,
}: {
  segment: ParsedSegment;
  workspaceId: string;
  files: FileItem[];
  onFileApplied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const cb = segment.codeBlock!;
  const matchedFile = cb.filePath
    ? findMatchingFile(cb.filePath, files, cb.code)
    : findMatchingFile("", files, cb.code);

  const canApply = !!(matchedFile || cb.filePath);
  const targetPath = matchedFile?.path || cb.filePath || "";
  const isNewFile = !matchedFile && !!cb.filePath;

  async function handleCopy() {
    await navigator.clipboard.writeText(cb.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleApply() {
    if (!targetPath) return;
    setApplying(true);
    setApplyError(null);

    try {
      const res = await fetch(`/api/workspace/${workspaceId}/apply-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: targetPath,
          content: cb.code,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setApplied(true);
        onFileApplied?.();
      } else {
        setApplyError(data.error || "应用失败");
      }
    } catch {
      setApplyError("网络错误");
    }
    setApplying(false);
  }

  const lineCount = cb.code.split("\n").length;
  const isLong = lineCount > 20;

  return (
    <div className="my-2 rounded-lg border bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] text-gray-400 border-gray-700 h-5"
          >
            {cb.language}
          </Badge>
          {matchedFile && (
            <span className="text-[11px] text-gray-500 font-mono truncate max-w-[200px]">
              {matchedFile.path}
            </span>
          )}
          <span className="text-[10px] text-gray-600">{lineCount} 行</span>
        </div>
        <div className="flex items-center gap-1">
          {isLong && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Code content */}
      {!collapsed && (
        <pre className="p-3 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed max-h-[400px] overflow-y-auto">
          {cb.code}
        </pre>
      )}
      {collapsed && (
        <div className="px-3 py-2 text-xs text-gray-500 italic">
          代码已折叠（{lineCount} 行）点击展开
        </div>
      )}

      {/* Apply button */}
      {canApply && (
        <div className="px-3 py-2 border-t border-gray-800 bg-gray-900/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <FileCode className="h-3 w-3" />
            <span>
              {isNewFile ? "新文件" : "匹配文件"}:{" "}
              <span className="text-gray-400 font-mono">{targetPath}</span>
            </span>
          </div>
          {applied ? (
            <div className="flex items-center gap-1.5 text-green-400 text-xs">
              <Check className="h-3.5 w-3.5" />
              {isNewFile ? "已保存" : "已应用"}
            </div>
          ) : applyError ? (
            <div className="flex items-center gap-1.5">
              <span className="text-red-400 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {applyError}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                onClick={handleApply}
              >
                重试
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              {isNewFile ? "保存为新文件" : "应用修改"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({
  role,
  content,
  workspaceId,
  files,
  onFileApplied,
}: ChatMessageProps) {
  const segments = useMemo(() => {
    if (role === "user") return null;
    return parseAiResponse(content);
  }, [role, content]);

  if (role === "user") {
    return (
      <div className="max-w-[80%] ml-auto rounded-lg p-3 text-sm bg-primary text-primary-foreground">
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <div className="max-w-[90%] rounded-lg p-3 text-sm bg-muted text-foreground">
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    );
  }

  return (
    <div className="max-w-[90%] rounded-lg p-3 bg-muted text-foreground">
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <TextBlock key={i} content={seg.content} />
        ) : (
          <CodeBlock
            key={i}
            segment={seg}
            workspaceId={workspaceId}
            files={files}
            onFileApplied={onFileApplied}
          />
        )
      )}
    </div>
  );
}
