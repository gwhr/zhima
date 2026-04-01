import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { Worker } from "bullmq";
import { PrismaClient, type AiTaskType, type Prisma } from "@prisma/client";
import { generateText } from "ai";
import { parseCodeBlocks, type ParsedFile } from "../lib/parser/code-parser";
import { buildDocx } from "../lib/thesis/docx-builder";
import { renderMermaidToPng, renderMermaidToSvg, extractMermaidBlocks } from "../lib/chart/renderer";
import {
  generateERDiagram,
  generateArchitectureDiagram,
  generateUseCaseDiagram,
  inferTableSchemas,
  type TableSchema,
} from "../lib/chart/diagram-generator";
import sharp from "sharp";
import * as path from "path";
import { uploadFile, downloadFile } from "../lib/storage/oss";
import { getRuntimeModel, type RuntimeModel } from "../lib/ai/runtime-model";
import {
  releaseTokenReservation,
  settleTokenReservation,
} from "../lib/billing/token-wallet";

function resolveRedisConnection() {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname || "localhost",
      port: Number(parsed.port || 6379),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: parsed.pathname ? Number(parsed.pathname.slice(1) || 0) : 0,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    };
  } catch {
    return {
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    };
  }
}

const connection = resolveRedisConnection();

const db = new PrismaClient();

async function saveFile(key: string, content: string | Buffer) {
  return uploadFile(key, content);
}

const DEFAULT_CODE_MODEL_ID = "deepseek";
const DEFAULT_THESIS_MODEL_ID = "glm";

function resolveModelId(value: string | undefined, fallback: string): string {
  if (!value || !value.trim()) return fallback;
  return value.trim().toLowerCase();
}

const CODE_MODEL_ID = resolveModelId(
  process.env.CODE_GEN_MODEL_ID,
  DEFAULT_CODE_MODEL_ID
);
const THESIS_MODEL_ID = resolveModelId(
  process.env.THESIS_GEN_MODEL_ID,
  DEFAULT_THESIS_MODEL_ID
);
const DEFAULT_SINGLE_TASK_TOKEN_HARD_LIMIT = Number.isFinite(
  Number(process.env.SINGLE_TASK_TOKEN_HARD_LIMIT)
)
  ? Math.max(1_000, Number(process.env.SINGLE_TASK_TOKEN_HARD_LIMIT))
  : 240_000;

type UsageLike = {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  cacheHitTokens?: number;
  cachedInputTokens?: number;
  cacheReadInputTokens?: number;
};

interface TokenUsageSummary {
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens: number;
  totalTokens: number;
}

function normalizeUsage(usage: UsageLike | undefined): TokenUsageSummary {
  const inputTokens = usage?.inputTokens ?? usage?.promptTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? usage?.completionTokens ?? 0;
  const cacheHitTokens =
    usage?.cacheHitTokens ?? usage?.cachedInputTokens ?? usage?.cacheReadInputTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    cacheHitTokens,
    totalTokens: inputTokens + outputTokens + cacheHitTokens,
  };
}

function addUsage(
  total: TokenUsageSummary,
  next: TokenUsageSummary
): TokenUsageSummary {
  const inputTokens = total.inputTokens + next.inputTokens;
  const outputTokens = total.outputTokens + next.outputTokens;
  const cacheHitTokens = total.cacheHitTokens + next.cacheHitTokens;
  return {
    inputTokens,
    outputTokens,
    cacheHitTokens,
    totalTokens: inputTokens + outputTokens + cacheHitTokens,
  };
}

function resolveSingleTaskTokenHardLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SINGLE_TASK_TOKEN_HARD_LIMIT;
  }
  return Math.max(1_000, Math.floor(parsed));
}

function enforceSingleTaskTokenHardLimit(
  usage: TokenUsageSummary,
  hardLimit: number,
  phase: string
) {
  if (usage.totalTokens <= hardLimit) return;
  throw new Error(
    `${phase}超出单次任务 Token 上限（${usage.totalTokens} > ${hardLimit}），请拆分需求后重试。`
  );
}

async function settleWorkerUsage(params: {
  reservationId: string;
  userId: string;
  workspaceId: string;
  taskJobId: string;
  taskType: AiTaskType;
  modelId: string;
  usage: TokenUsageSummary;
  durationMs: number;
}) {
  return settleTokenReservation({
    reservationId: params.reservationId,
    userId: params.userId,
    workspaceId: params.workspaceId,
    taskType: params.taskType,
    modelId: params.modelId,
    usage: {
      inputTokens: params.usage.inputTokens,
      outputTokens: params.usage.outputTokens,
      cacheHitTokens: params.usage.cacheHitTokens,
    },
    durationMs: params.durationMs,
    description: `Settle worker usage for ${params.taskType}`,
  });
}

async function updateJobProgress(
  jobId: string,
  progress: number,
  stage: string,
  detail: string,
  modelOrExtras?: string | Record<string, unknown>,
  extras: Record<string, unknown> = {}
) {
  const modelId =
    typeof modelOrExtras === "string"
      ? modelOrExtras
      : undefined;
  const mergedExtras =
    typeof modelOrExtras === "string" ? extras : modelOrExtras || {};

  const resultPayload: Record<string, unknown> = {
    stage,
    detail,
    updatedAt: new Date().toISOString(),
    ...mergedExtras,
  };
  if (modelId) {
    resultPayload.model = modelId;
  }

  await db.taskJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      progress,
      result: resultPayload as Prisma.InputJsonValue,
    },
  });
}

interface Requirements {
  summary?: string;
  roles?: { name: string; description: string }[];
  modules?: { name: string; features: string[]; enabled?: boolean }[];
  tables?: string[];
}

function requiresDualEnd(requirements: Requirements): boolean {
  const roleText = (requirements.roles || [])
    .map((role) => `${role.name} ${role.description}`)
    .join(" ");
  const moduleText = (requirements.modules || [])
    .map((module) => `${module.name} ${(module.features || []).join(" ")}`)
    .join(" ");
  const fullText = `${roleText} ${moduleText}`.toLowerCase();

  const hasAdmin = /管理员|管理端|后台|admin/.test(fullText);
  const hasUser = /用户|客户端|前台|user/.test(fullText);
  return hasAdmin && hasUser;
}

function sanitizeGeneratedPath(filePath: string): string {
  const normalized = filePath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^\.\//, "")
    .trim();
  if (!normalized || normalized.includes("\0")) {
    return "";
  }
  return normalized;
}

function rewriteGeneratedPath(
  generatedPath: string,
  techStack: Record<string, string>
): string {
  const parsed = path.parse(generatedPath);
  const ext = parsed.ext.toLowerCase();
  const generatedNum = parsed.name.match(/^generated_(\d+)$/i)?.[1];
  const readableName = generatedNum ? `module-${generatedNum}` : parsed.name.replace(/_/g, "-").toLowerCase();
  const className = generatedNum ? `Module${generatedNum}` : parsed.name;
  const slug = readableName;
  const backend = (techStack.backend || "").toLowerCase();
  const frontend = (techStack.frontend || "").toLowerCase();

  if (ext === ".java") {
    return `backend/src/main/java/com/example/generated/${className}.java`;
  }
  if (ext === ".vue" || (ext === ".js" && frontend.includes("vue"))) {
    return `frontend/src/views/generated/${slug}${ext}`;
  }
  if (ext === ".tsx" || ext === ".jsx" || ext === ".ts" || ext === ".js") {
    return `frontend/src/generated/${slug}${ext}`;
  }
  if (ext === ".sql") {
    return `backend/sql/${slug}.sql`;
  }
  if (ext === ".json") {
    return backend.includes("java")
      ? `backend/src/main/resources/${className}.json`
      : `backend/config/${className}.json`;
  }
  if (ext === ".md") {
    return parsed.name.toLowerCase() === "readme" ? "README.md" : `docs/${slug}.md`;
  }
  return `generated/${slug || "file"}${ext || ".txt"}`;
}

function buildFallbackReadme(
  workspaceName: string,
  workspaceTopic: string,
  techStack: Record<string, string>
): string {
  return `# ${workspaceName}

## 项目说明

本项目由智码 AI 根据「${workspaceTopic}」自动生成。

## 技术栈

- 后端：${techStack.backend || "未指定"}
- 前端：${techStack.frontend || "未指定"}
- 数据库：${techStack.database || "未指定"}

## 本地运行（示例）

\`\`\`bash
# 安装依赖
npm install

# 启动开发环境
npm run dev
\`\`\`
`;
}

function normalizeGeneratedFiles(
  rawFiles: ParsedFile[],
  workspaceName: string,
  workspaceTopic: string,
  techStack: Record<string, string>
): ParsedFile[] {
  const deduped = new Map<string, ParsedFile>();

  for (const file of rawFiles) {
    const normalizedPath = sanitizeGeneratedPath(file.path);
    if (!normalizedPath) continue;
    const finalPath = /^generated_\d+\.\w+$/i.test(normalizedPath)
      ? rewriteGeneratedPath(normalizedPath, techStack)
      : normalizedPath;
    if (finalPath.length > 180) continue;

    deduped.set(finalPath, {
      ...file,
      path: finalPath,
      content: `${file.content.trim()}\n`,
    });
  }

  const hasReadme = Array.from(deduped.keys()).some(
    (p) => p.toLowerCase() === "readme.md"
  );
  if (!hasReadme) {
    deduped.set("README.md", {
      path: "README.md",
      language: "markdown",
      content: buildFallbackReadme(workspaceName, workspaceTopic, techStack),
    });
  }

  return Array.from(deduped.values());
}

function hasPath(files: ParsedFile[], matcher: RegExp): boolean {
  return files.some((file) => matcher.test(file.path.toLowerCase()));
}

function addMissingFiles(baseFiles: ParsedFile[], extras: ParsedFile[]): ParsedFile[] {
  const merged = new Map<string, ParsedFile>();
  for (const file of baseFiles) {
    merged.set(file.path.toLowerCase(), file);
  }
  for (const file of extras) {
    const key = file.path.toLowerCase();
    if (!merged.has(key)) {
      merged.set(key, file);
    }
  }
  return Array.from(merged.values());
}

function buildRunnableReadme(
  workspaceName: string,
  workspaceTopic: string,
  techStack: Record<string, string>
): string {
  const backend = (techStack.backend || "").toLowerCase();
  const frontend = (techStack.frontend || "").toLowerCase();

  const backendRun = backend.includes("java")
    ? [
        "cd backend",
        "mvn -q -DskipTests spring-boot:run",
      ]
    : [
        "cd backend",
        "npm install",
        "npm run dev",
      ];

  const frontendRun =
    frontend.includes("vue") || frontend.includes("react")
      ? ["cd frontend", "npm install", "npm run dev"]
      : ["cd frontend", "npm install", "npm run dev"];

  return `# ${workspaceName}

## 项目说明

本项目由智码助手根据「${workspaceTopic}」生成，已补齐可运行的最小项目结构。

## 技术栈

- backend: ${techStack.backend || "未指定"}
- frontend: ${techStack.frontend || "未指定"}
- database: ${techStack.database || "未指定"}

## 快速启动

### 1) 启动后端

\`\`\`bash
${backendRun.join("\n")}
\`\`\`

### 2) 启动前端

\`\`\`bash
${frontendRun.join("\n")}
\`\`\`

### 3) 默认地址

- 前端开发服务: http://127.0.0.1:5173
- 后端开发服务: http://127.0.0.1:8080 (Java) / http://127.0.0.1:3001 (Node)
`;
}

function ensureRunnableProjectFiles(
  files: ParsedFile[],
  workspaceName: string,
  workspaceTopic: string,
  techStack: Record<string, string>
): ParsedFile[] {
  const backend = (techStack.backend || "").toLowerCase();
  const frontend = (techStack.frontend || "").toLowerCase();
  const extras: ParsedFile[] = [];

  if (!hasPath(files, /^readme\.md$/i)) {
    extras.push({
      path: "README.md",
      language: "markdown",
      content: buildRunnableReadme(workspaceName, workspaceTopic, techStack),
    });
  }

  if (!hasPath(files, /^backend\/sql\/.+\.sql$/i)) {
    extras.push({
      path: "backend/sql/init.sql",
      language: "sql",
      content:
        "-- initialize demo tables\nCREATE TABLE IF NOT EXISTS users (\n  id BIGINT PRIMARY KEY,\n  username VARCHAR(64) NOT NULL,\n  password VARCHAR(128) NOT NULL,\n  role VARCHAR(32) DEFAULT 'USER'\n);\n",
    });
  }

  if (backend.includes("java")) {
    if (!hasPath(files, /^backend\/pom\.xml$/i)) {
      extras.push({
        path: "backend/pom.xml",
        language: "xml",
        content:
          "<project xmlns=\"http://maven.apache.org/POM/4.0.0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.example</groupId>\n  <artifactId>demo</artifactId>\n  <version>0.0.1-SNAPSHOT</version>\n  <parent>\n    <groupId>org.springframework.boot</groupId>\n    <artifactId>spring-boot-starter-parent</artifactId>\n    <version>3.3.5</version>\n  </parent>\n  <properties>\n    <java.version>17</java.version>\n  </properties>\n  <dependencies>\n    <dependency>\n      <groupId>org.springframework.boot</groupId>\n      <artifactId>spring-boot-starter-web</artifactId>\n    </dependency>\n    <dependency>\n      <groupId>org.springframework.boot</groupId>\n      <artifactId>spring-boot-starter-validation</artifactId>\n    </dependency>\n    <dependency>\n      <groupId>com.mysql</groupId>\n      <artifactId>mysql-connector-j</artifactId>\n      <scope>runtime</scope>\n    </dependency>\n  </dependencies>\n  <build>\n    <plugins>\n      <plugin>\n        <groupId>org.springframework.boot</groupId>\n        <artifactId>spring-boot-maven-plugin</artifactId>\n      </plugin>\n    </plugins>\n  </build>\n</project>\n",
      });
    }
    if (
      !hasPath(
        files,
        /^backend\/src\/main\/java\/.+\/[a-z0-9_]+application\.java$/i
      )
    ) {
      extras.push({
        path: "backend/src/main/java/com/example/Application.java",
        language: "java",
        content:
          "package com.example;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\n\n@SpringBootApplication\npublic class Application {\n  public static void main(String[] args) {\n    SpringApplication.run(Application.class, args);\n  }\n}\n",
      });
    }
    if (
      !hasPath(
        files,
        /^backend\/src\/main\/resources\/application(\-[a-z0-9]+)?\.ya?ml$/i
      )
    ) {
      extras.push({
        path: "backend/src/main/resources/application.yml",
        language: "yaml",
        content:
          "server:\n  port: 8080\nspring:\n  datasource:\n    url: jdbc:mysql://127.0.0.1:3306/demo?useSSL=false&serverTimezone=UTC\n    username: root\n    password: root\n",
      });
    }
    if (
      !hasPath(files, /^backend\/src\/main\/java\/.+\/controller\/.+\.java$/i)
    ) {
      extras.push({
        path: "backend/src/main/java/com/example/controller/HealthController.java",
        language: "java",
        content:
          "package com.example.controller;\n\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\npublic class HealthController {\n  @GetMapping(\"/api/health\")\n  public String health() {\n    return \"ok\";\n  }\n}\n",
      });
    }
  } else {
    if (!hasPath(files, /^backend\/package\.json$/i)) {
      extras.push({
        path: "backend/package.json",
        language: "json",
        content:
          '{\n  "name": "backend",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "dev": "node src/main.js"\n  },\n  "dependencies": {\n    "express": "^4.19.2",\n    "cors": "^2.8.5"\n  }\n}\n',
      });
    }
    if (!hasPath(files, /^backend\/src\/main\.(js|ts)$/i)) {
      extras.push({
        path: "backend/src/main.js",
        language: "javascript",
        content:
          "import express from \"express\";\nimport cors from \"cors\";\n\nconst app = express();\napp.use(cors());\napp.use(express.json());\n\napp.get(\"/api/health\", (_req, res) => {\n  res.json({ ok: true });\n});\n\napp.listen(3001, () => {\n  console.log(\"backend running on http://127.0.0.1:3001\");\n});\n",
      });
    }
  }

  if (frontend.includes("vue")) {
    if (!hasPath(files, /^frontend\/package\.json$/i)) {
      extras.push({
        path: "frontend/package.json",
        language: "json",
        content:
          '{\n  "name": "frontend",\n  "private": true,\n  "version": "0.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "preview": "vite preview"\n  },\n  "dependencies": {\n    "vue": "^3.5.13",\n    "vue-router": "^4.4.5"\n  },\n  "devDependencies": {\n    "vite": "^5.4.9"\n  }\n}\n',
      });
    }
    if (!hasPath(files, /^frontend\/vite\.config\.(js|ts)$/i)) {
      extras.push({
        path: "frontend/vite.config.js",
        language: "javascript",
        content:
          "import { defineConfig } from \"vite\";\n\nexport default defineConfig({\n  server: {\n    host: \"0.0.0.0\",\n    port: 5173,\n  },\n});\n",
      });
    }
    if (!hasPath(files, /^frontend\/index\.html$/i)) {
      extras.push({
        path: "frontend/index.html",
        language: "html",
        content:
          "<!doctype html>\n<html lang=\"zh-CN\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>毕业设计项目</title>\n  </head>\n  <body>\n    <div id=\"app\"></div>\n    <script type=\"module\" src=\"/src/main.js\"></script>\n  </body>\n</html>\n",
      });
    }
    if (!hasPath(files, /^frontend\/src\/main\.(js|ts)$/i)) {
      extras.push({
        path: "frontend/src/main.js",
        language: "javascript",
        content:
          "import { createApp } from \"vue\";\nimport App from \"./App.vue\";\n\ncreateApp(App).mount(\"#app\");\n",
      });
    }
    if (!hasPath(files, /^frontend\/src\/app\.vue$/i)) {
      extras.push({
        path: "frontend/src/App.vue",
        language: "vue",
        content:
          "<template>\n  <main style=\"padding: 24px; font-family: Arial, sans-serif;\">\n    <h1>项目已生成</h1>\n    <p>你可以在此基础上继续完善业务逻辑。</p>\n  </main>\n</template>\n",
      });
    }
  } else if (frontend.includes("react")) {
    if (!hasPath(files, /^frontend\/package\.json$/i)) {
      extras.push({
        path: "frontend/package.json",
        language: "json",
        content:
          '{\n  "name": "frontend",\n  "private": true,\n  "version": "0.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "tsc && vite build",\n    "preview": "vite preview"\n  },\n  "dependencies": {\n    "react": "^18.3.1",\n    "react-dom": "^18.3.1"\n  },\n  "devDependencies": {\n    "@types/react": "^18.3.11",\n    "@types/react-dom": "^18.3.1",\n    "typescript": "^5.6.3",\n    "vite": "^5.4.9"\n  }\n}\n',
      });
    }
    if (!hasPath(files, /^frontend\/vite\.config\.(js|ts)$/i)) {
      extras.push({
        path: "frontend/vite.config.ts",
        language: "typescript",
        content:
          'import { defineConfig } from "vite";\n\nexport default defineConfig({\n  server: {\n    host: "0.0.0.0",\n    port: 5173,\n  },\n});\n',
      });
    }
    if (!hasPath(files, /^frontend\/index\.html$/i)) {
      extras.push({
        path: "frontend/index.html",
        language: "html",
        content:
          "<!doctype html>\n<html lang=\"zh-CN\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>毕业设计项目</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script type=\"module\" src=\"/src/main.tsx\"></script>\n  </body>\n</html>\n",
      });
    }
    if (!hasPath(files, /^frontend\/src\/main\.(tsx|jsx)$/i)) {
      extras.push({
        path: "frontend/src/main.tsx",
        language: "typescript",
        content:
          'import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")!).render(<App />);\n',
      });
    }
    if (!hasPath(files, /^frontend\/src\/app\.(tsx|jsx)$/i)) {
      extras.push({
        path: "frontend/src/App.tsx",
        language: "typescript",
        content:
          "export default function App() {\n  return (\n    <main style={{ padding: 24, fontFamily: \"Arial, sans-serif\" }}>\n      <h1>项目已生成</h1>\n      <p>你可以在此基础上继续完善业务逻辑。</p>\n    </main>\n  );\n}\n",
      });
    }
  }

  if (!hasPath(files, /^backend\/readme\.md$/i)) {
    extras.push({
      path: "backend/README.md",
      language: "markdown",
      content: "# Backend\n\n后端目录已补齐启动所需基础文件。\n",
    });
  }
  if (!hasPath(files, /^frontend\/readme\.md$/i)) {
    extras.push({
      path: "frontend/README.md",
      language: "markdown",
      content: "# Frontend\n\n前端目录已补齐启动所需基础文件。\n",
    });
  }

  return addMissingFiles(files, extras);
}

function buildCodeGenPrompt(
  workspace: { name: string; topic: string; techStack: unknown; requirements: unknown }
): string {
  const techStack = (workspace.techStack as Record<string, string>) || {};
  const requirements = (workspace.requirements as Requirements) || {};
  const dualEndRequired = requiresDualEnd(requirements);
  const modules = requirements.modules || [];
  const roles = requirements.roles || [];
  const tables = requirements.tables || [];

  const techStr =
    Object.entries(techStack)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ") || "Java Spring Boot + Vue 3 + MySQL";

  const modulesText =
    modules.map((m) => `- ${m.name}: ${m.features.join("、")}`).join("\n") || "- 基础 CRUD";
  const rolesText =
    roles.map((r) => `- ${r.name}: ${r.description}`).join("\n") || "- 管理员 / 普通用户";
  const tablesText = tables.map((t) => `- ${t}`).join("\n") || "- users";
  const dualEndRule = dualEndRequired
    ? "7. 本项目必须同时包含“用户端”和“后台管理端”两套页面（或路由）与对应后端接口。"
    : "7. 按需求决定系统端形态（单端/双端/多端），不要强行添加无关端；若出现管理角色，再补充管理端页面与接口。";
  const uiQualityRules = `
8. 前端不要只给“单页占位内容”，至少提供 2 个有业务字段/交互的页面，并且导航可切换。
9. UI 需具备基础美观度：统一字号与间距层级、主次按钮区分、卡片/表格有留白边界，并适配常见桌面宽度。`;

  return `你是资深全栈工程师。请为以下毕设项目生成“可运行”的最小完整代码骨架。

项目名称：${workspace.name}
项目选题：${workspace.topic}
技术栈：${techStr}

系统角色：
${rolesText}

功能模块：
${modulesText}

数据库表：
${tablesText}

强制输出规范（必须严格遵守）：
1. 仅输出代码文件，不要解释性自然语言。
2. 每个文件必须使用下面格式（每个文件一个代码块）：
File: 相对路径
\`\`\`语言 // 相对路径
...文件内容...
\`\`\`
3. 路径必须使用相对路径，禁止绝对路径，禁止 \`../\`。
4. 至少输出 10 个文件，且必须包含 \`README.md\`。
5. 必须覆盖：后端入口、前端入口、至少 2 个业务页面、至少 2 个 API、1 个数据模型/SQL、1 个配置文件。
6. 代码风格以教学可读性为主，可添加必要中文注释。
${dualEndRule}
${uiQualityRules}

建议目录结构（按技术栈灵活调整）：
- backend/
- frontend/
- docs/（可选）`;
}

const MIN_CODE_FILES = 12;
const MAX_CODE_GEN_ATTEMPTS = 3;

function buildCodeGenAttemptPrompt(
  basePrompt: string,
  attempt: number,
  dualEndRequired: boolean
): string {
  if (attempt === 1) return basePrompt;

  const structureRetryRule = dualEndRequired
    ? "5. 必须出现用户端页面（如 frontend/src/views/user/**）和管理端页面（如 frontend/src/views/admin/**），并提供对应 API。"
    : "5. 端形态按需求决定，页面与 API 需要与 roles/modules 对齐；若无管理角色，不要硬塞 admin 页面。";

  return `${basePrompt}

【纠偏重试 #${attempt}】
你上一次输出的文件数量不足，必须严格满足以下要求：
1. 这次至少输出 12 个文件代码块；
2. 每个代码块都要带明确文件路径，格式必须是：
File: 相对路径
\`\`\`语言 // 相对路径
...文件内容...
\`\`\`
3. 必须包含以下关键文件：
- backend 启动入口
- backend 至少 2 个业务接口（controller/router）
- backend 至少 1 个数据模型或 SQL
- frontend 启动入口
- frontend 至少 2 个页面
- README.md
4. 只输出代码文件，不要输出解释文字。
${structureRetryRule}
6. 前端页面必须包含基础样式与信息层次，不要仅返回纯文本段落。`;
}

async function generateCodeFilesWithRetry(
  workspace: { name: string; topic: string; techStack: unknown; requirements: unknown },
  techStack: Record<string, string>,
  selectedModel: RuntimeModel,
  singleTaskTokenHardLimit: number
): Promise<{
  files: ParsedFile[];
  attempts: number;
  fallback: boolean;
  usage: TokenUsageSummary;
}> {
  const requirements = (workspace.requirements as Requirements) || {};
  const dualEndRequired = requiresDualEnd(requirements);
  const basePrompt = buildCodeGenPrompt(workspace);
  let files: ParsedFile[] = [];
  let usage: TokenUsageSummary = {
    inputTokens: 0,
    outputTokens: 0,
    cacheHitTokens: 0,
    totalTokens: 0,
  };

  for (let attempt = 1; attempt <= MAX_CODE_GEN_ATTEMPTS; attempt++) {
    const prompt = buildCodeGenAttemptPrompt(basePrompt, attempt, dualEndRequired);
    const result = await generateText({ model: selectedModel, prompt });
    usage = addUsage(usage, normalizeUsage(result.usage as UsageLike));
    enforceSingleTaskTokenHardLimit(
      usage,
      singleTaskTokenHardLimit,
      "代码生成"
    );
    files = normalizeGeneratedFiles(
      parseCodeBlocks(result.text),
      workspace.name,
      workspace.topic,
      techStack
    );
    files = ensureRunnableProjectFiles(
      files,
      workspace.name,
      workspace.topic,
      techStack
    );

    console.log(
      `[Worker] code-gen attempt ${attempt}/${MAX_CODE_GEN_ATTEMPTS}, parsed files=${files.length}`
    );

    if (files.length >= MIN_CODE_FILES) {
      return { files, attempts: attempt, fallback: false, usage };
    }
  }

  const backend = (techStack.backend || "").toLowerCase();
  const frontend = (techStack.frontend || "").toLowerCase();

  const fallbackFiles: ParsedFile[] = [
    {
      path: "README.md",
      language: "markdown",
      content: buildFallbackReadme(workspace.name, workspace.topic, techStack),
    },
    {
      path: "backend/README.md",
      language: "markdown",
      content: `# Backend\n\n本目录为 ${workspace.name} 的后端骨架代码（自动兜底生成）。\n`,
    },
    {
      path: "frontend/README.md",
      language: "markdown",
      content: `# Frontend\n\n本目录为 ${workspace.name} 的前端骨架代码（自动兜底生成）。\n`,
    },
    {
      path: "backend/sql/init.sql",
      language: "sql",
      content: `-- ${workspace.topic} 初始化表（兜底）\nCREATE TABLE IF NOT EXISTS users (\n  id BIGINT PRIMARY KEY,\n  username VARCHAR(64) NOT NULL,\n  password VARCHAR(128) NOT NULL,\n  role VARCHAR(32) DEFAULT 'USER',\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS products (\n  id BIGINT PRIMARY KEY,\n  name VARCHAR(128) NOT NULL,\n  price DECIMAL(10,2) NOT NULL,\n  status VARCHAR(32) DEFAULT 'ON_SHELF',\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS orders (\n  id BIGINT PRIMARY KEY,\n  user_id BIGINT NOT NULL,\n  product_id BIGINT NOT NULL,\n  amount DECIMAL(10,2) NOT NULL,\n  status VARCHAR(32) DEFAULT 'CREATED',\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n`,
    },
  ];

  if (backend.includes("java")) {
    fallbackFiles.push(
      {
        path: "backend/pom.xml",
        language: "xml",
        content:
          "<project xmlns=\"http://maven.apache.org/POM/4.0.0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.example</groupId>\n  <artifactId>demo</artifactId>\n  <version>0.0.1-SNAPSHOT</version>\n  <parent>\n    <groupId>org.springframework.boot</groupId>\n    <artifactId>spring-boot-starter-parent</artifactId>\n    <version>3.3.5</version>\n  </parent>\n  <properties>\n    <java.version>17</java.version>\n  </properties>\n  <dependencies>\n    <dependency>\n      <groupId>org.springframework.boot</groupId>\n      <artifactId>spring-boot-starter-web</artifactId>\n    </dependency>\n    <dependency>\n      <groupId>org.springframework.boot</groupId>\n      <artifactId>spring-boot-starter-data-jpa</artifactId>\n    </dependency>\n    <dependency>\n      <groupId>com.mysql</groupId>\n      <artifactId>mysql-connector-j</artifactId>\n      <scope>runtime</scope>\n    </dependency>\n  </dependencies>\n</project>\n",
      },
      {
        path: "backend/src/main/java/com/example/Application.java",
        language: "java",
        content:
          "package com.example;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\n\n@SpringBootApplication\npublic class Application {\n  public static void main(String[] args) {\n    SpringApplication.run(Application.class, args);\n  }\n}\n",
      },
      {
        path: "backend/src/main/java/com/example/controller/HealthController.java",
        language: "java",
        content:
          "package com.example.controller;\n\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\npublic class HealthController {\n  @GetMapping(\"/api/health\")\n  public String health() {\n    return \"ok\";\n  }\n}\n",
      },
      {
        path: "backend/src/main/java/com/example/controller/ItemController.java",
        language: "java",
        content:
          "package com.example.controller;\n\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\nimport java.util.List;\nimport java.util.Map;\n\n@RestController\n@RequestMapping(\"/api/items\")\npublic class ItemController {\n  @GetMapping\n  public List<Map<String, Object>> list() {\n    return List.of(Map.of(\"id\", 1, \"name\", \"示例条目\", \"price\", 99.0));\n  }\n}\n",
      },
      {
        path: "backend/src/main/java/com/example/controller/StatsController.java",
        language: "java",
        content:
          "package com.example.controller;\n\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\nimport java.util.Map;\n\n@RestController\n@RequestMapping(\"/api/stats\")\npublic class StatsController {\n  @GetMapping\n  public Map<String, Object> overview() {\n    return Map.of(\"users\", 120, \"orders\", 35, \"sales\", 10240);\n  }\n}\n",
      },
      {
        path: "backend/src/main/java/com/example/entity/User.java",
        language: "java",
        content:
          "package com.example.entity;\n\nimport jakarta.persistence.Entity;\nimport jakarta.persistence.Id;\nimport jakarta.persistence.Table;\n\n@Entity\n@Table(name = \"users\")\npublic class User {\n  @Id\n  private Long id;\n  private String username;\n  private String password;\n  private String role;\n}\n",
      },
      {
        path: "backend/src/main/java/com/example/entity/Product.java",
        language: "java",
        content:
          "package com.example.entity;\n\nimport jakarta.persistence.Entity;\nimport jakarta.persistence.Id;\nimport jakarta.persistence.Table;\n\nimport java.math.BigDecimal;\n\n@Entity\n@Table(name = \"products\")\npublic class Product {\n  @Id\n  private Long id;\n  private String name;\n  private BigDecimal price;\n  private String status;\n}\n",
      },
      {
        path: "backend/src/main/resources/application.yml",
        language: "yaml",
        content:
          "server:\n  port: 8080\nspring:\n  datasource:\n    url: jdbc:mysql://localhost:3306/demo\n    username: root\n    password: root\n",
      },
      {
        path: "backend/src/main/resources/application-dev.yml",
        language: "yaml",
        content:
          "spring:\n  jpa:\n    hibernate:\n      ddl-auto: update\n    show-sql: true\n",
      }
    );
  } else {
    fallbackFiles.push(
      {
        path: "backend/package.json",
        language: "json",
        content:
          '{\n  "name": "backend",\n  "private": true,\n  "scripts": {\n    "dev": "node src/main.js"\n  }\n}\n',
      },
      {
        path: "backend/src/main.js",
        language: "javascript",
        content:
          "import http from \"node:http\";\nimport { listItems } from \"./routes/items.js\";\nimport { getStats } from \"./routes/stats.js\";\n\nconst server = http.createServer((req, res) => {\n  res.setHeader(\"content-type\", \"application/json\");\n  if (req.url === \"/api/items\") return res.end(JSON.stringify(listItems()));\n  if (req.url === \"/api/stats\") return res.end(JSON.stringify(getStats()));\n  return res.end(JSON.stringify({ ok: true }));\n});\n\nserver.listen(3001, () => {\n  console.log(\"backend running on :3001\");\n});\n",
      },
      {
        path: "backend/src/routes/health.js",
        language: "javascript",
        content: "export const health = { status: \"ok\" };\n",
      },
      {
        path: "backend/src/routes/items.js",
        language: "javascript",
        content: "export function listItems() {\n  return [{ id: 1, name: \"示例条目\", price: 99 }];\n}\n",
      },
      {
        path: "backend/src/routes/stats.js",
        language: "javascript",
        content: "export function getStats() {\n  return { users: 100, orders: 20, sales: 8000 };\n}\n",
      }
    );
  }

  if (frontend.includes("vue")) {
    fallbackFiles.push(
      {
        path: "frontend/package.json",
        language: "json",
        content:
          '{\n  "name": "frontend",\n  "private": true,\n  "scripts": {\n    "dev": "vite"\n  }\n}\n',
      },
      {
        path: "frontend/index.html",
        language: "html",
        content:
          "<!doctype html>\n<html lang=\"zh-CN\">\n  <head><meta charset=\"UTF-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" /><title>毕业设计助手示例项目</title></head>\n  <body><div id=\"app\"></div><script type=\"module\" src=\"/src/main.js\"></script></body>\n</html>\n",
      },
      {
        path: "frontend/src/main.js",
        language: "javascript",
        content:
          "import { createApp } from \"vue\";\nimport App from \"./App.vue\";\nimport router from \"./router\";\n\ncreateApp(App).use(router).mount(\"#app\");\n",
      },
      {
        path: "frontend/src/router/index.js",
        language: "javascript",
        content:
          "import { createRouter, createWebHashHistory } from \"vue-router\";\nimport OverviewView from \"../views/OverviewView.vue\";\nimport WorkflowView from \"../views/WorkflowView.vue\";\nimport DataBoardView from \"../views/DataBoardView.vue\";\n\nconst routes = [\n  { path: \"/\", component: OverviewView },\n  { path: \"/workflow\", component: WorkflowView },\n  { path: \"/data-board\", component: DataBoardView },\n];\n\nexport default createRouter({ history: createWebHashHistory(), routes });\n",
      },
      {
        path: "frontend/src/App.vue",
        language: "vue",
        content:
          "<template>\n  <main style=\"padding: 24px; font-family: Arial, sans-serif; max-width: 960px; margin: 0 auto;\">\n    <header style=\"display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;\">\n      <div>\n        <h1 style=\"margin:0;\">项目骨架已生成</h1>\n        <p style=\"margin-top:6px; color:#64748b;\">按当前需求生成的示例模块路由，可继续在此基础上扩展。</p>\n      </div>\n      <span style=\"font-size:12px; background:#e0f2fe; color:#0369a1; padding:6px 10px; border-radius:999px;\">可运行示例</span>\n    </header>\n    <nav style=\"display:flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;\">\n      <RouterLink to=\"/\" style=\"padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; text-decoration:none;\">概览页</RouterLink>\n      <RouterLink to=\"/workflow\" style=\"padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; text-decoration:none;\">流程页</RouterLink>\n      <RouterLink to=\"/data-board\" style=\"padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; text-decoration:none;\">数据看板</RouterLink>\n    </nav>\n    <section style=\"margin-top: 16px; border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#f8fafc;\">\n      <RouterView />\n    </section>\n  </main>\n</template>\n",
      },
      {
        path: "frontend/src/views/OverviewView.vue",
        language: "vue",
        content:
          "<template><section><h2>概览页</h2><p>展示项目摘要、核心指标和近期动态。</p></section></template>\n",
      },
      {
        path: "frontend/src/views/WorkflowView.vue",
        language: "vue",
        content:
          "<template><section><h2>流程页</h2><p>展示业务流程节点、处理状态和操作入口。</p></section></template>\n",
      },
      {
        path: "frontend/src/views/DataBoardView.vue",
        language: "vue",
        content:
          "<template><section><h2>数据看板</h2><p>展示统计图表、趋势指标和业务监控信息。</p></section></template>\n",
      }
    );
  } else {
    fallbackFiles.push(
      {
        path: "frontend/package.json",
        language: "json",
        content:
          '{\n  "name": "frontend",\n  "private": true,\n  "scripts": {\n    "dev": "vite"\n  }\n}\n',
      },
      {
        path: "frontend/index.html",
        language: "html",
        content:
          "<!doctype html>\n<html lang=\"zh-CN\">\n  <head><meta charset=\"UTF-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" /><title>毕业设计助手示例项目</title></head>\n  <body><div id=\"root\"></div><script type=\"module\" src=\"/src/main.tsx\"></script></body>\n</html>\n",
      },
      {
        path: "frontend/src/main.tsx",
        language: "typescript",
        content:
          "import React from \"react\";\nimport { createRoot } from \"react-dom/client\";\nimport App from \"./App\";\n\ncreateRoot(document.getElementById(\"root\")!).render(<App />);\n",
      },
      {
        path: "frontend/src/App.tsx",
        language: "typescript",
        content:
          "import { useState } from \"react\";\nimport { OverviewPage } from \"./pages/OverviewPage\";\nimport { WorkflowPage } from \"./pages/WorkflowPage\";\nimport { DataBoardPage } from \"./pages/DataBoardPage\";\n\ntype View = \"overview\" | \"workflow\" | \"dataBoard\";\n\nconst tabStyle: React.CSSProperties = {\n  padding: \"8px 12px\",\n  border: \"1px solid #cbd5e1\",\n  borderRadius: 8,\n  background: \"#fff\",\n  cursor: \"pointer\",\n};\n\nexport default function App() {\n  const [view, setView] = useState<View>(\"overview\");\n  return (\n    <main style={{ padding: 24, fontFamily: \"Arial, sans-serif\", maxWidth: 960, margin: \"0 auto\" }}>\n      <h1 style={{ margin: 0 }}>项目骨架已生成</h1>\n      <p style={{ color: \"#64748b\", marginTop: 8 }}>按需求生成的可运行示例页面，可继续扩展业务逻辑。</p>\n      <div style={{ display: \"flex\", gap: 8, margin: \"12px 0\", flexWrap: \"wrap\" }}>\n        <button style={tabStyle} onClick={() => setView(\"overview\")}>概览页</button>\n        <button style={tabStyle} onClick={() => setView(\"workflow\")}>流程页</button>\n        <button style={tabStyle} onClick={() => setView(\"dataBoard\")}>数据看板</button>\n      </div>\n      <section style={{ border: \"1px solid #e2e8f0\", borderRadius: 12, padding: 16, background: \"#f8fafc\" }}>\n        {view === \"overview\" && <OverviewPage />}\n        {view === \"workflow\" && <WorkflowPage />}\n        {view === \"dataBoard\" && <DataBoardPage />}\n      </section>\n    </main>\n  );\n}\n",
      },
      {
        path: "frontend/src/pages/OverviewPage.tsx",
        language: "typescript",
        content:
          "export function OverviewPage() {\n  return <section><h2>概览页</h2><p>展示项目摘要、核心指标和近期动态。</p></section>;\n}\n",
      },
      {
        path: "frontend/src/pages/WorkflowPage.tsx",
        language: "typescript",
        content:
          "export function WorkflowPage() {\n  return <section><h2>流程页</h2><p>展示业务流程节点、处理状态和操作入口。</p></section>;\n}\n",
      },
      {
        path: "frontend/src/pages/DataBoardPage.tsx",
        language: "typescript",
        content:
          "export function DataBoardPage() {\n  return <section><h2>数据看板</h2><p>展示统计图表、趋势指标和业务监控信息。</p></section>;\n}\n",
      }
    );
  }

  console.warn(
    `[Worker] code-gen fallback activated, parsed files=${files.length}, fallback files=${fallbackFiles.length}`
  );

  return {
    files: ensureRunnableProjectFiles(
      normalizeGeneratedFiles(
        fallbackFiles,
        workspace.name,
        workspace.topic,
        techStack
      ),
      workspace.name,
      workspace.topic,
      techStack
    ),
    attempts: MAX_CODE_GEN_ATTEMPTS,
    fallback: true,
    usage,
  };
}

async function generateDiagramsPng(
  workspace: { id: string; topic: string; techStack: unknown; requirements: unknown }
): Promise<{
  architecture?: { pngBuffer: Buffer; width: number; height: number };
  er?: { pngBuffer: Buffer; width: number; height: number };
  useCase?: { pngBuffer: Buffer; width: number; height: number };
  svgs: { name: string; svg: string }[];
}> {
  const techStack = (workspace.techStack as Record<string, string>) || {};
  const requirements = (workspace.requirements as Requirements) || {};
  const svgs: { name: string; svg: string }[] = [];

  const diagrams: {
    architecture?: { pngBuffer: Buffer; width: number; height: number };
    er?: { pngBuffer: Buffer; width: number; height: number };
    useCase?: { pngBuffer: Buffer; width: number; height: number };
  } = {};

  const renderToPngSafe = async (
    name: string,
    mermaidCode: string
  ): Promise<{ pngBuffer: Buffer; width: number; height: number } | null> => {
    try {
      console.log(`[Worker] Rendering ${name}...`);
      const svg = await renderMermaidToSvg(mermaidCode);
      svgs.push({ name, svg });
      const pngBuffer = await sharp(Buffer.from(svg))
        .resize({ width: 800, withoutEnlargement: true })
        .png()
        .toBuffer();
      const meta = await sharp(pngBuffer).metadata();
      return { pngBuffer, width: meta.width || 800, height: meta.height || 400 };
    } catch (err) {
      console.error(`[Worker] Failed to render ${name}:`, err);
      return null;
    }
  };

  const archMermaid = generateArchitectureDiagram(techStack, requirements);
  const archResult = await renderToPngSafe("系统架构图", archMermaid);
  if (archResult) diagrams.architecture = archResult;

  const erMermaid = generateERDiagram(requirements);
  const erResult = await renderToPngSafe("ER关系图", erMermaid);
  if (erResult) diagrams.er = erResult;

  const ucMermaid = generateUseCaseDiagram(requirements);
  const ucResult = await renderToPngSafe("用例功能图", ucMermaid);
  if (ucResult) diagrams.useCase = ucResult;

  return { ...diagrams, svgs };
}

const worker = new Worker(
  "zhima-tasks",
  async (job) => {
    console.log(`[Worker] Processing job ${job.id} type=${job.name}`);
    const { jobId, workspaceId, userId, reservationId } = job.data;
    const singleTaskTokenHardLimit = resolveSingleTaskTokenHardLimit(
      job.data.singleTaskTokenHardLimit
    );

    try {
      await updateJobProgress(jobId, 10, "任务启动", "任务已进入执行队列");

      const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) throw new Error("Workspace not found");

      switch (job.name) {
        case "code-gen": {
          if (!reservationId) {
            throw new Error("Token reservation is required for code generation");
          }
          const codeModelId = resolveModelId(job.data.modelId, CODE_MODEL_ID);
          await updateJobProgress(
            jobId,
            20,
            "读取项目需求",
            "正在读取需求、技术栈和功能模块",
            codeModelId
          );

          const codeModel = await getRuntimeModel(codeModelId);
          await updateJobProgress(
            jobId,
            32,
            "规划项目结构",
            "正在规划目录结构与模块边界",
            codeModelId
          );
          const codeTaskType: AiTaskType = "CODE_GEN";
          const codeStartAt = Date.now();
          const techStack = workspace.techStack as Record<string, string>;
          const { files, attempts, fallback, usage } =
            await generateCodeFilesWithRetry(
              workspace,
              techStack,
              codeModel,
              singleTaskTokenHardLimit
            );

          await updateJobProgress(
            jobId,
            52,
            "整理生成结果",
            `代码草稿生成完成，正在整理可运行工程（${files.length} 个文件）`,
            codeModelId,
            { attempts, fallback }
          );

          await updateJobProgress(
            jobId,
            60,
            "写入项目文件",
            `开始写入 ${files.length} 个文件`,
            codeModelId,
            { attempts, fallback }
          );

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const storageKey = `workspaces/${workspaceId}/code/${file.path}`;
            await saveFile(storageKey, file.content);

            await db.workspaceFile.upsert({
              where: { workspaceId_path: { workspaceId, path: file.path } },
              create: { workspaceId, path: file.path, type: "CODE", storageKey, size: Buffer.byteLength(file.content) },
              update: { storageKey, size: Buffer.byteLength(file.content) },
            });

            if ((i + 1) % Math.max(1, Math.floor(files.length / 5)) === 0 || i === files.length - 1) {
              const saveProgress = Math.min(
                95,
                60 + Math.round(((i + 1) / files.length) * 35)
              );
              await updateJobProgress(
                jobId,
                saveProgress,
                "写入项目文件",
                `已写入 ${i + 1}/${files.length} 个文件：${file.path}`,
                codeModelId,
                { attempts, fallback }
              );
            }
          }

          const settlement = await settleWorkerUsage({
            reservationId,
            userId,
            workspaceId,
            taskJobId: jobId,
            taskType: codeTaskType,
            modelId: codeModelId,
            usage,
            durationMs: Date.now() - codeStartAt,
          });

          await db.taskJob.update({
            where: { id: jobId },
            data: {
              status: "COMPLETED",
              progress: 100,
              result: {
                stage: "代码生成完成",
                detail: `共生成 ${files.length} 个文件`,
                model: codeModelId,
                fileCount: files.length,
                attempts,
                fallback,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                cacheHitTokens: usage.cacheHitTokens,
                totalTokens: usage.totalTokens,
                billedPoints: settlement.billedPoints,
                costYuan: settlement.costYuan,
                billingMultiplier: settlement.multiplier,
                pointRate: settlement.pointRate,
              },
            },
          });

          await db.notification.create({
            data: {
              userId,
              type: "GENERATE_DONE",
              title: "代码生成完成",
              content: fallback
                ? `项目「${workspace.name}」已生成兜底代码骨架，共 ${files.length} 个文件。`
                : `项目「${workspace.name}」的代码已生成完成，共 ${files.length} 个文件。`,
            },
          });
          break;
        }

        case "thesis-gen": {
          if (!reservationId) {
            throw new Error("Token reservation is required for thesis generation");
          }
          const thesisModelId = resolveModelId(job.data.modelId, THESIS_MODEL_ID);
          const thesisModel = await getRuntimeModel(thesisModelId);
          const thesisTaskType: AiTaskType = "THESIS";
          const thesisStartAt = Date.now();
          let thesisUsage: TokenUsageSummary = {
            inputTokens: 0,
            outputTokens: 0,
            cacheHitTokens: 0,
            totalTokens: 0,
          };
          const techStack = workspace.techStack as Record<string, string>;
          const techStr = Object.entries(techStack).map(([k, v]) => `${k}: ${v}`).join(", ");
          const requirements = (workspace.requirements as Requirements) || {};
          const roles = requirements.roles || [];
          const modules = requirements.modules || [];
          const tables = requirements.tables || [];
          const activeTemplate = await db.thesisTemplate.findFirst({
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              path: true,
              storageKey: true,
              size: true,
            },
          });

          if (activeTemplate) {
            try {
              const templateBuffer = await downloadFile(activeTemplate.storageKey);
              const templateExt = path.extname(activeTemplate.path) || ".docx";
              const templatePath = `templates/平台论文模板${templateExt}`;
              const workspaceTemplateStorageKey = `workspaces/${workspaceId}/${templatePath}`;

              await saveFile(workspaceTemplateStorageKey, templateBuffer);
              await db.workspaceFile.upsert({
                where: {
                  workspaceId_path: {
                    workspaceId,
                    path: templatePath,
                  },
                },
                create: {
                  workspaceId,
                  path: templatePath,
                  type: "CONFIG",
                  storageKey: workspaceTemplateStorageKey,
                  size: templateBuffer.length,
                },
                update: {
                  storageKey: workspaceTemplateStorageKey,
                  size: templateBuffer.length,
                },
              });
            } catch (templateError) {
              console.warn(
                `[Worker] Failed to attach active template for workspace ${workspaceId}:`,
                templateError
              );
            }
          }

          // --- Step 1: Generate diagrams (20%) ---
          await updateJobProgress(
            jobId,
            15,
            "准备图表素材",
            "正在生成图表资源（架构图 / ER 图 / 用例图）",
            thesisModelId
          );
          console.log("[Worker] Generating diagrams for thesis...");

          const diagramResult = await generateDiagramsPng(workspace);
          const tableSchemas = inferTableSchemas(tables, requirements);

          // Save diagram SVGs as standalone files
          for (const { name, svg } of diagramResult.svgs) {
            const svgKey = `workspaces/${workspaceId}/charts/${name}.svg`;
            await saveFile(svgKey, svg);
            await db.workspaceFile.upsert({
              where: { workspaceId_path: { workspaceId, path: `charts/${name}.svg` } },
              create: { workspaceId, path: `charts/${name}.svg`, type: "CHART", storageKey: svgKey, size: Buffer.byteLength(svg) },
              update: { storageKey: svgKey, size: Buffer.byteLength(svg) },
            });
          }

          await updateJobProgress(
            jobId,
            25,
            "构建写作上下文",
            "图表资源已就绪，正在整理章节写作上下文",
            thesisModelId
          );

          // --- Step 2: Build context for AI ---
          const rolesDesc = roles.map((r) => `${r.name}: ${r.description}`).join("\n");
          const modulesDesc = modules.map((m) => `${m.name}: ${m.features.join("、")}`).join("\n");
          const tablesDesc = tableSchemas.map((t) =>
            `${t.displayName}(${t.name}): ${t.fields.map((f) => f.name).join(", ")}`
          ).join("\n");

          const projectContext = `
项目题目：${workspace.topic}
技术栈：${techStr || "未指定"}

系统角色：
${rolesDesc || "未定义"}

功能模块：
${modulesDesc || "未定义"}

数据库表（含字段）：
${tablesDesc || "未定义"}

注意：论文中的图表（系统架构图、ER图、用例图、数据库表结构表）将由系统自动插入到对应章节末尾，你在撰写时可以引用"如图所示"、"如下表所示"等，但不需要自己画图或列表格。`;

          // --- Step 3: Generate chapters (25%-90%) ---
          const chapters = [
            { key: "abstract", title: "摘要", wordCount: 600,
              extra: "包含中文摘要和关键词。摘要需概括研究背景、目的、方法、主要结果。关键词3-5个。" },
            { key: "introduction", title: "绪论", wordCount: 3000,
              extra: "包含研究背景与意义、国内外研究现状、研究内容与方法、论文组织结构。" },
            { key: "requirements", title: "需求分析", wordCount: 3500,
              extra: `包含系统可行性分析、功能需求分析（按角色和模块展开）、非功能需求分析。文末提到"系统用例分析如图所示"。\n\n系统角色和功能模块信息：\n${rolesDesc}\n${modulesDesc}` },
            { key: "design", title: "系统设计", wordCount: 4500,
              extra: `包含系统架构设计（提到"系统架构如图所示"）、功能模块设计（逐模块展开）、数据库设计（提到"E-R图如图所示"、"各表结构如下表所示"）。不需要自己列表格，系统会自动插入。\n\n数据库表信息：\n${tablesDesc}` },
            { key: "implementation", title: "系统实现", wordCount: 4000,
              extra: "包含开发环境搭建、核心功能实现（至少3个关键模块的实现细节、包含代码片段）、界面展示。" },
            { key: "testing", title: "系统测试", wordCount: 2500,
              extra: "包含测试环境、测试方案（单元测试+功能测试+性能测试）、测试用例表（至少列出5个测试用例）、测试结果分析。" },
            { key: "conclusion", title: "总结与展望", wordCount: 1500,
              extra: "总结本系统的主要工作和创新点，指出不足之处，提出未来改进方向。" },
          ];

          const chapterContents: { title: string; content: string }[] = [];

          for (let i = 0; i < chapters.length; i++) {
            const ch = chapters[i];
            const progress = Math.round(25 + ((i + 1) / chapters.length) * 60);
            await updateJobProgress(
              jobId,
              progress,
              "撰写章节",
              `正在撰写章节 ${i + 1}/${chapters.length}：${ch.title}`,
              thesisModelId,
              { chapterIndex: i + 1, chapterTotal: chapters.length, chapterTitle: ch.title }
            );

            console.log(`[Worker] Generating chapter: ${ch.title} (${i + 1}/${chapters.length})`);

            const result = await generateText({
              model: thesisModel,
              prompt: `你是一位计算机科学专业的资深论文写作专家。请为以下毕业设计撰写「${ch.title}」章节。

${projectContext}

本章要求：
- 字数：约${ch.wordCount}字
- 写作风格：学术论文正式写法，专业术语准确
- ${ch.extra}

格式要求：
1. 用 ## 标记二级标题，用 ### 标记三级标题
2. 段落之间空行分隔
3. 内容要与本项目（${workspace.topic}）紧密结合，不要泛泛而谈
4. 适当使用"首先/其次/最后"、"综上所述"等过渡词保证逻辑连贯`,
            });

            thesisUsage = addUsage(
              thesisUsage,
              normalizeUsage(result.usage as UsageLike)
            );
            enforceSingleTaskTokenHardLimit(
              thesisUsage,
              singleTaskTokenHardLimit,
              "论文生成"
            );
            chapterContents.push({ title: ch.key, content: result.text });
          }

          // Add references and acknowledgements
          chapterContents.push({
            title: "references",
            content: `[1] 王珊, 萨师煊. 数据库系统概论（第五版）[M]. 北京: 高等教育出版社, 2014.
[2] 林锐. 高质量程序设计指南[M]. 北京: 电子工业出版社, 2003.
[3] Gamma E, Helm R, Johnson R, et al. Design Patterns: Elements of Reusable Object-Oriented Software[M]. Addison-Wesley, 1994.
[4] Fowler M. Patterns of Enterprise Application Architecture[M]. Addison-Wesley, 2002.
[5] 汤小丹, 梁红兵, 哲凤屏, 等. 计算机操作系统（第四版）[M]. 西安: 西安电子科技大学出版社, 2014.
[6] Bruce Eckel. Java编程思想（第4版）[M]. 北京: 机械工业出版社, 2007.
[7] 阮一峰. ECMAScript 6 入门[M]. 北京: 电子工业出版社, 2017.
[8] Spring Framework Documentation[EB/OL]. https://spring.io/projects/spring-framework.
[9] Vue.js 官方文档[EB/OL]. https://cn.vuejs.org.
[10] MySQL 8.0 Reference Manual[EB/OL]. https://dev.mysql.com/doc/refman/8.0/en.`,
          });

          chapterContents.push({
            title: "acknowledgements",
            content: `在本论文的撰写过程中，我得到了许多人的帮助和支持。

首先，我要衷心感谢我的指导老师，在整个毕业设计过程中给予了我悉心的指导和宝贵的建议，从选题到系统设计，从代码实现到论文撰写，老师严谨的治学态度和丰富的专业知识让我受益匪浅。

其次，我要感谢我的同学们，在项目开发过程中与我积极讨论、互相帮助，让我能够克服一个又一个技术难题。

同时，我要感谢我的家人，感谢他们一直以来对我学业的支持和鼓励，是他们的关爱给了我前进的动力。

最后，感谢所有在我学习生涯中给予过我帮助的老师和朋友，没有你们的支持，就没有今天的我。

谢谢大家！`,
          });

          // --- Step 4: Build DOCX (90%-100%) ---
          await updateJobProgress(
            jobId,
            90,
            "排版与导出",
            "正在组装 DOCX 并写入图表与表结构",
            thesisModelId
          );
          console.log("[Worker] Building DOCX with diagrams and tables...");

          const diagramImages: {
            architecture?: { label: string; caption: string; pngBuffer: Buffer; width: number; height: number };
            er?: { label: string; caption: string; pngBuffer: Buffer; width: number; height: number };
            useCase?: { label: string; caption: string; pngBuffer: Buffer; width: number; height: number };
          } = {};

          if (diagramResult.architecture) {
            diagramImages.architecture = {
              label: "arch",
              caption: "图 3-1 系统架构图",
              ...diagramResult.architecture,
            };
          }
          if (diagramResult.er) {
            diagramImages.er = {
              label: "er",
              caption: "图 3-2 数据库E-R图",
              ...diagramResult.er,
            };
          }
          if (diagramResult.useCase) {
            diagramImages.useCase = {
              label: "usecase",
              caption: "图 2-1 系统用例图",
              ...diagramResult.useCase,
            };
          }

          const docxBuffer = await buildDocx({
            title: workspace.topic,
            author: "智码用户",
            chapters: chapterContents,
            diagrams: diagramImages,
            tableSchemas,
          });

          const storageKey = `workspaces/${workspaceId}/thesis/毕业论文.docx`;
          await updateJobProgress(
            jobId,
            94,
            "保存论文文件",
            "正在保存 DOCX / Markdown 文件",
            thesisModelId
          );
          await saveFile(storageKey, docxBuffer);

          await db.workspaceFile.upsert({
            where: { workspaceId_path: { workspaceId, path: "毕业论文.docx" } },
            create: { workspaceId, path: "毕业论文.docx", type: "THESIS", storageKey, size: docxBuffer.length },
            update: { storageKey, size: docxBuffer.length },
          });

          const mdContent = chapterContents.map((c) => `# ${c.title}\n\n${c.content}`).join("\n\n---\n\n");
          const mdKey = `workspaces/${workspaceId}/thesis/毕业论文.md`;
          await saveFile(mdKey, mdContent);

          await db.workspaceFile.upsert({
            where: { workspaceId_path: { workspaceId, path: "毕业论文.md" } },
            create: { workspaceId, path: "毕业论文.md", type: "THESIS", storageKey: mdKey, size: Buffer.byteLength(mdContent) },
            update: { storageKey: mdKey, size: Buffer.byteLength(mdContent) },
          });

          await db.taskJob.update({
            where: { id: jobId },
            data: {
              status: "COMPLETED",
              progress: 100,
              result: {
                stage: "论文生成完成",
                detail: `章节 ${chapters.length + 2}，图表 ${diagramResult.svgs.length}，表结构 ${tableSchemas.length}`,
                model: thesisModelId,
                chapters: chapters.length + 2,
                diagrams: diagramResult.svgs.length,
                tables: tableSchemas.length,
                templateName: activeTemplate?.name ?? null,
                inputTokens: thesisUsage.inputTokens,
                outputTokens: thesisUsage.outputTokens,
                cacheHitTokens: thesisUsage.cacheHitTokens,
                totalTokens: thesisUsage.totalTokens,
              },
            },
          });

          const settlement = await settleWorkerUsage({
            reservationId,
            userId,
            workspaceId,
            taskJobId: jobId,
            taskType: thesisTaskType,
            modelId: thesisModelId,
            usage: thesisUsage,
            durationMs: Date.now() - thesisStartAt,
          });

          await db.taskJob.update({
            where: { id: jobId },
            data: {
              result: {
                stage: "论文生成完成",
                detail: `章节 ${chapters.length + 2}，图表 ${diagramResult.svgs.length}，表结构 ${tableSchemas.length}`,
                model: thesisModelId,
                chapters: chapters.length + 2,
                diagrams: diagramResult.svgs.length,
                tables: tableSchemas.length,
                templateName: activeTemplate?.name ?? null,
                inputTokens: thesisUsage.inputTokens,
                outputTokens: thesisUsage.outputTokens,
                cacheHitTokens: thesisUsage.cacheHitTokens,
                totalTokens: thesisUsage.totalTokens,
                billedPoints: settlement.billedPoints,
                costYuan: settlement.costYuan,
                billingMultiplier: settlement.multiplier,
                pointRate: settlement.pointRate,
              },
            },
          });

          await db.notification.create({
            data: {
              userId,
              type: "GENERATE_DONE",
              title: "论文生成完成",
              content: `项目「${workspace.name}」的毕业论文已生成完成，含 ${chapters.length + 2} 个章节、${diagramResult.svgs.length} 张图表、${tableSchemas.length} 个数据库表结构。`,
            },
          });
          break;
        }

        case "chart-render": {
          await updateJobProgress(jobId, 20, "生成图表", "正在渲染图表资源");
          console.log("[Worker] Generating charts...");

          const { svgs } = await generateDiagramsPng(workspace);

          await updateJobProgress(jobId, 80, "生成图表", "图表渲染完成，正在保存文件");

          for (const { name, svg } of svgs) {
            const storageKey = `workspaces/${workspaceId}/charts/${name}.svg`;
            await saveFile(storageKey, svg);

            await db.workspaceFile.upsert({
              where: { workspaceId_path: { workspaceId, path: `charts/${name}.svg` } },
              create: { workspaceId, path: `charts/${name}.svg`, type: "CHART", storageKey, size: Buffer.byteLength(svg) },
              update: { storageKey, size: Buffer.byteLength(svg) },
            });
          }

          await db.taskJob.update({
            where: { id: jobId },
            data: {
              status: "COMPLETED",
              progress: 100,
              result: {
                stage: "图表生成完成",
                detail: `共生成 ${svgs.length} 张图`,
                model: resolveModelId(job.data.modelId, THESIS_MODEL_ID),
                chartCount: svgs.length,
              },
            },
          });

          await db.notification.create({
            data: {
              userId,
              type: "GENERATE_DONE",
              title: "图表生成完成",
              content: `项目「${workspace.name}」的图表已生成完成，共 ${svgs.length} 张（系统架构图、ER关系图、用例功能图）。`,
            },
          });
          break;
        }

        case "preview": {
          await db.taskJob.update({
            where: { id: jobId },
            data: {
              status: "COMPLETED",
              progress: 100,
              result: {
                stage: "预览准备完成",
                detail: "预览功能已就绪",
                model: resolveModelId(job.data.modelId, CODE_MODEL_ID),
                message: "预览功能已就绪",
              },
            },
          });
          break;
        }

        default:
          console.warn(`[Worker] Unknown job type: ${job.name}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Worker] Job ${jobId} failed:`, message);
      const totalAttempts =
        typeof job.opts.attempts === "number" && job.opts.attempts > 0
          ? job.opts.attempts
          : 1;
      const currentAttempt = job.attemptsMade + 1;
      const willRetry = currentAttempt < totalAttempts;
      const noRetryError =
        message.includes("Insufficient token balance") ||
        message.includes("daily spend limit") ||
        message.includes("Token reservation");
      const finalWillRetry = noRetryError ? false : willRetry;
      await db.taskJob.update({
        where: { id: jobId },
        data: {
          status: finalWillRetry ? "PENDING" : "FAILED",
          error: message,
          result: {
            stage: "任务失败",
            detail: finalWillRetry
              ? `${message}（准备重试 ${currentAttempt}/${totalAttempts}）`
              : message,
            model: resolveModelId(job.data.modelId, CODE_MODEL_ID),
            attemptsMade: currentAttempt,
            attemptsTotal: totalAttempts,
            retrying: finalWillRetry,
          },
        },
      });

      if (!finalWillRetry && reservationId) {
        await releaseTokenReservation({
          reservationId,
          reason: `Job failed: ${message}`,
        }).catch((releaseError) => {
          console.error(
            `[Worker] Failed to release reservation ${reservationId}:`,
            releaseError
          );
        });
      }
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

console.log("[Worker] BullMQ worker started, waiting for jobs...");
