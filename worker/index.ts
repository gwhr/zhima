import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { Worker } from "bullmq";
import { PrismaClient, type AiTaskType } from "@prisma/client";
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
import { getModelPricing } from "../lib/model-catalog-config";

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
};

interface TokenUsageSummary {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

function normalizeUsage(usage: UsageLike | undefined): TokenUsageSummary {
  const inputTokens = usage?.inputTokens ?? usage?.promptTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? usage?.completionTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

function addUsage(
  total: TokenUsageSummary,
  next: TokenUsageSummary
): TokenUsageSummary {
  const inputTokens = total.inputTokens + next.inputTokens;
  const outputTokens = total.outputTokens + next.outputTokens;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
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

async function recordWorkerUsage(params: {
  userId: string;
  workspaceId: string;
  taskType: AiTaskType;
  modelId: string;
  usage: TokenUsageSummary;
  durationMs: number;
}) {
  if (params.usage.totalTokens <= 0) return;

  const costs = await getModelPricing(params.modelId);
  const costYuan =
    (params.usage.inputTokens / 1_000_000) * costs.input +
    (params.usage.outputTokens / 1_000_000) * costs.output;

  await db.aiUsageLog.create({
    data: {
      userId: params.userId,
      workspaceId: params.workspaceId,
      taskType: params.taskType,
      model: params.modelId,
      inputTokens: params.usage.inputTokens,
      outputTokens: params.usage.outputTokens,
      costYuan,
      durationMs: params.durationMs,
    },
  });
}

async function updateJobProgress(
  jobId: string,
  progress: number,
  stage: string,
  detail: string,
  modelOrExtras: string | Record<string, unknown> = DEFAULT_CODE_MODEL_ID,
  extras: Record<string, unknown> = {}
) {
  const modelId =
    typeof modelOrExtras === "string"
      ? modelOrExtras
      : DEFAULT_CODE_MODEL_ID;
  const mergedExtras =
    typeof modelOrExtras === "string" ? extras : modelOrExtras;

  await db.taskJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      progress,
      result: {
        stage,
        detail,
        model: modelId,
        updatedAt: new Date().toISOString(),
        ...mergedExtras,
      },
    },
  });
}

interface Requirements {
  summary?: string;
  roles?: { name: string; description: string }[];
  modules?: { name: string; features: string[]; enabled?: boolean }[];
  tables?: string[];
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

function buildCodeGenPrompt(
  workspace: { name: string; topic: string; techStack: unknown; requirements: unknown }
): string {
  const techStack = (workspace.techStack as Record<string, string>) || {};
  const requirements = (workspace.requirements as Requirements) || {};
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

建议目录结构（按技术栈灵活调整）：
- backend/
- frontend/
- docs/（可选）`;
}

const MIN_CODE_FILES = 6;
const MAX_CODE_GEN_ATTEMPTS = 3;

function buildCodeGenAttemptPrompt(basePrompt: string, attempt: number): string {
  if (attempt === 1) return basePrompt;

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
4. 只输出代码文件，不要输出解释文字。`;
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
  const basePrompt = buildCodeGenPrompt(workspace);
  let files: ParsedFile[] = [];
  let usage: TokenUsageSummary = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  for (let attempt = 1; attempt <= MAX_CODE_GEN_ATTEMPTS; attempt++) {
    const prompt = buildCodeGenAttemptPrompt(basePrompt, attempt);
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
      content: `-- ${workspace.topic} 初始化表（兜底）\nCREATE TABLE IF NOT EXISTS users (\n  id BIGINT PRIMARY KEY,\n  username VARCHAR(64) NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n`,
    },
  ];

  if (backend.includes("java")) {
    fallbackFiles.push(
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
        path: "backend/src/main/resources/application.yml",
        language: "yaml",
        content:
          "server:\n  port: 8080\nspring:\n  datasource:\n    url: jdbc:mysql://localhost:3306/demo\n    username: root\n    password: root\n",
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
          "import http from \"node:http\";\n\nconst server = http.createServer((_req, res) => {\n  res.setHeader(\"content-type\", \"application/json\");\n  res.end(JSON.stringify({ ok: true }));\n});\n\nserver.listen(3001, () => {\n  console.log(\"backend running on :3001\");\n});\n",
      },
      {
        path: "backend/src/routes/health.js",
        language: "javascript",
        content: "export const health = { status: \"ok\" };\n",
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
        path: "frontend/src/main.js",
        language: "javascript",
        content:
          "import { createApp } from \"vue\";\nimport App from \"./App.vue\";\n\ncreateApp(App).mount(\"#app\");\n",
      },
      {
        path: "frontend/src/App.vue",
        language: "vue",
        content:
          "<template>\n  <main style=\"padding: 24px; font-family: Arial;\">\n    <h1>项目骨架已生成</h1>\n    <p>可基于此继续完善业务功能。</p>\n  </main>\n</template>\n",
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
        path: "frontend/src/main.tsx",
        language: "typescript",
        content:
          "import React from \"react\";\nimport { createRoot } from \"react-dom/client\";\nimport App from \"./App\";\n\ncreateRoot(document.getElementById(\"root\")!).render(<App />);\n",
      },
      {
        path: "frontend/src/App.tsx",
        language: "typescript",
        content:
          "export default function App() {\n  return (\n    <main style={{ padding: 24, fontFamily: \"Arial\" }}>\n      <h1>项目骨架已生成</h1>\n      <p>可基于此继续完善业务功能。</p>\n    </main>\n  );\n}\n",
      }
    );
  }

  console.warn(
    `[Worker] code-gen fallback activated, parsed files=${files.length}, fallback files=${fallbackFiles.length}`
  );

  return {
    files: normalizeGeneratedFiles(
      fallbackFiles,
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
    const { jobId, workspaceId, userId } = job.data;
    const singleTaskTokenHardLimit = resolveSingleTaskTokenHardLimit(
      job.data.singleTaskTokenHardLimit
    );

    try {
      await updateJobProgress(jobId, 10, "任务启动", "任务已进入执行队列");

      const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) throw new Error("Workspace not found");

      switch (job.name) {
        case "code-gen": {
          await updateJobProgress(
            jobId,
            20,
            "生成代码",
            "正在分析需求并构建代码生成提示词"
          );

          const codeModelId = resolveModelId(job.data.modelId, CODE_MODEL_ID);
          const codeModel = await getRuntimeModel(codeModelId);
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
            60,
            "保存代码文件",
            `AI 生成完成，开始保存 ${files.length} 个文件`,
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
                "保存代码文件",
                `已保存 ${i + 1}/${files.length} 个文件`,
                { attempts, fallback }
              );
            }
          }

          await recordWorkerUsage({
            userId,
            workspaceId,
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
                totalTokens: usage.totalTokens,
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
          const thesisModelId = resolveModelId(job.data.modelId, THESIS_MODEL_ID);
          const thesisModel = await getRuntimeModel(thesisModelId);
          const thesisTaskType: AiTaskType = "THESIS";
          const thesisStartAt = Date.now();
          let thesisUsage: TokenUsageSummary = {
            inputTokens: 0,
            outputTokens: 0,
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
            "生成论文",
            "正在生成图表资源（架构图 / ER 图 / 用例图）"
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
            "生成论文",
            "图表资源已就绪，正在准备章节上下文"
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
              "生成论文",
              `正在生成章节 ${i + 1}/${chapters.length}：${ch.title}`,
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
            "组装文档",
            "正在组装 DOCX 并写入图表与表结构"
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
                totalTokens: thesisUsage.totalTokens,
              },
            },
          });

          await recordWorkerUsage({
            userId,
            workspaceId,
            taskType: thesisTaskType,
            modelId: thesisModelId,
            usage: thesisUsage,
            durationMs: Date.now() - thesisStartAt,
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
      await db.taskJob.update({
        where: { id: jobId },
        data: {
          status: willRetry ? "PENDING" : "FAILED",
          error: message,
          result: {
            stage: "任务失败",
            detail: willRetry
              ? `${message}（准备重试 ${currentAttempt}/${totalAttempts}）`
              : message,
            model: resolveModelId(job.data.modelId, CODE_MODEL_ID),
            attemptsMade: currentAttempt,
            attemptsTotal: totalAttempts,
            retrying: willRetry,
          },
        },
      });
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
