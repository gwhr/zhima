export interface ParsedCodeBlock {
  language: string;
  code: string;
  filePath: string | null;
}

export interface ParsedSegment {
  type: "text" | "code";
  content: string;
  codeBlock?: ParsedCodeBlock;
}

const FILE_PATH_PATTERNS = [
  /文件[路径名]?\s*[：:]\s*[`「]?([^\s`」\n]+)[`」]?/,
  /[Ff]ile\s*[：:]\s*[`]?([^\s`\n]+)[`]?/,
  /[`]([^\s`]+\.(java|ts|tsx|js|jsx|vue|html|css|xml|yml|yaml|json|sql|py|properties|txt|md))[`]/,
  /路径\s*[：:]\s*[`]?([^\s`\n]+)[`]?/,
];

function extractFilePathFromContext(textBefore: string): string | null {
  const lines = textBefore.split("\n").slice(-5);
  const context = lines.join("\n");

  for (const pattern of FILE_PATH_PATTERNS) {
    const match = context.match(pattern);
    if (match?.[1]) {
      let fp = match[1].replace(/^[`「『]+|[`」』]+$/g, "");
      const lastSlash = fp.lastIndexOf("/");
      if (lastSlash !== -1) {
        fp = fp.slice(lastSlash + 1);
      }
      const lastBackslash = fp.lastIndexOf("\\");
      if (lastBackslash !== -1) {
        fp = fp.slice(lastBackslash + 1);
      }
      return fp;
    }
  }
  return null;
}

export function parseAiResponse(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const beforeText = text.slice(lastIndex, match.index);
    if (beforeText.trim()) {
      segments.push({ type: "text", content: beforeText });
    }

    const language = match[1] || "text";
    const code = match[2].trimEnd();
    const allTextBefore = text.slice(0, match.index);
    const filePath = extractFilePathFromContext(allTextBefore);

    segments.push({
      type: "code",
      content: match[0],
      codeBlock: { language, code, filePath },
    });

    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex);
  if (remaining.trim()) {
    segments.push({ type: "text", content: remaining });
  }

  return segments;
}

export function findMatchingFile(
  suggestedPath: string,
  existingFiles: { id: string; path: string; type: string }[],
  codeContent?: string
): { id: string; path: string } | null {
  const codeFiles = existingFiles.filter((f) => f.type === "CODE");

  if (suggestedPath) {
    const normalized = suggestedPath.toLowerCase();

    const exact = codeFiles.find((f) => f.path.toLowerCase() === normalized);
    if (exact) return exact;

    const byName = codeFiles.find((f) => {
      const fName = f.path.split("/").pop()?.toLowerCase() || "";
      return fName === normalized || f.path.toLowerCase().endsWith(normalized);
    });
    if (byName) return byName;

    const baseName = (normalized.split("/").pop() || normalized).split("\\").pop() || normalized;
    const byBaseName = codeFiles.find((f) => {
      const fBase = (f.path.split("/").pop() || "").toLowerCase();
      return fBase === baseName;
    });
    if (byBaseName) return byBaseName;
  }

  if (codeContent) {
    const classMatch = codeContent.match(/(?:public\s+)?class\s+(\w+)/);
    if (classMatch) {
      const className = classMatch[1].toLowerCase();
      const byClass = codeFiles.find((f) => {
        const fBase = (f.path.split("/").pop() || "").toLowerCase().replace(/\.\w+$/, "");
        return fBase === className;
      });
      if (byClass) return byClass;
    }

    const componentMatch = codeContent.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+(\w+)/);
    if (componentMatch) {
      const compName = componentMatch[1].toLowerCase();
      const byComp = codeFiles.find((f) => {
        const fBase = (f.path.split("/").pop() || "").toLowerCase().replace(/\.\w+$/, "");
        return fBase === compName;
      });
      if (byComp) return byComp;
    }
  }

  return null;
}
