export interface ParsedFile {
  path: string;
  content: string;
  language: string;
}

const PATH_BEFORE_BLOCK_PATTERNS = [
  /[`]([^\s`]+\.\w+)[`]\s*$/m,
  /文件[路径名]?\s*[：:]\s*[`]?([^\s`\n]+\.\w+)[`]?\s*$/m,
  /[Ff]ile\s*[：:]\s*[`]?([^\s`\n]+\.\w+)[`]?\s*$/m,
  /(?:\/\/|#)\s*(.+\.\w+)\s*$/m,
];

function extractPathFromPrecedingText(text: string): string | null {
  const lines = text.trim().split("\n").slice(-3);
  const context = lines.join("\n");
  for (const pattern of PATH_BEFORE_BLOCK_PATTERNS) {
    const match = context.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/^[`「]+|[`」]+$/g, "");
    }
  }
  return null;
}

export function parseCodeBlocks(text: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const regex = /```(\w+)?[ \t]*(?:\/\/\s*(.+?))?(?:#\s*(.+?))?\n([\s\S]*?)```/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const language = match[1] || "text";
    let commentPath = (match[2] || match[3] || "").trim();
    const content = match[4].trim();

    if (!content) continue;

    if (!commentPath) {
      const textBefore = text.slice(lastIndex, match.index);
      commentPath = extractPathFromPrecedingText(textBefore) || "";
    }

    let filePath = commentPath;
    if (!filePath) {
      const extMap: Record<string, string> = {
        javascript: "js", typescript: "ts", tsx: "tsx", jsx: "jsx",
        python: "py", java: "java", html: "html", css: "css",
        json: "json", sql: "sql", yaml: "yml", xml: "xml",
        vue: "vue", properties: "properties",
      };
      const ext = extMap[language] || language;
      filePath = `generated_${files.length + 1}.${ext}`;
    }

    files.push({ path: filePath, content, language });
    lastIndex = match.index + match[0].length;
  }

  if (files.length === 0) {
    const fileBlockRegex = /(?:文件|File|PATH)[：:]\s*[`"]?(.+?)[`"]?\n([\s\S]*?)(?=(?:文件|File|PATH)[：:]|\z)/gi;
    let blockMatch;
    while ((blockMatch = fileBlockRegex.exec(text)) !== null) {
      const path = blockMatch[1].trim();
      const content = blockMatch[2].trim();
      if (path && content) {
        files.push({ path, content, language: guessLanguage(path) });
      }
    }
  }

  return files;
}

function guessLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", java: "java", html: "html", css: "css",
    json: "json", sql: "sql", yml: "yaml", yaml: "yaml",
    md: "markdown", xml: "xml", sh: "bash",
  };
  return map[ext] || "text";
}
