import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { Worker } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { parseCodeBlocks } from "../lib/parser/code-parser";
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
import * as fs from "fs/promises";
import * as path from "path";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const db = new PrismaClient();

const STORAGE_DIR = path.join(process.cwd(), ".storage");

async function saveFile(key: string, content: string | Buffer) {
  const filePath = path.join(STORAGE_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
  return key;
}

const zhipu = createOpenAI({
  apiKey: process.env.ZHIPU_API_KEY || "",
  baseURL: process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
});
const model = zhipu.chat("glm-4-flash");

interface Requirements {
  summary?: string;
  roles?: { name: string; description: string }[];
  modules?: { name: string; features: string[]; enabled?: boolean }[];
  tables?: string[];
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

    try {
      await db.taskJob.update({
        where: { id: jobId },
        data: { status: "RUNNING", progress: 10 },
      });

      const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) throw new Error("Workspace not found");

      switch (job.name) {
        case "code-gen": {
          await db.taskJob.update({ where: { id: jobId }, data: { progress: 20 } });

          const techStack = workspace.techStack as Record<string, string>;
          const techStr = Object.entries(techStack).map(([k, v]) => `${k}: ${v}`).join(", ");

          const result = await generateText({
            model,
            prompt: `你是一个专业的全栈开发工程师。请为以下毕业设计项目生成完整的项目代码。

项目名称：${workspace.name}
选题：${workspace.topic}
技术栈：${techStr || "Java Spring Boot + Vue.js"}

要求：
1. 生成完整的项目结构，每个文件用 \`\`\`语言 // 文件路径 格式标注
2. 包含后端API、数据模型、前端页面
3. 包含 README.md 说明如何运行项目
4. 代码要有适当的中文注释
5. 至少生成8-10个核心文件`,
          });

          await db.taskJob.update({ where: { id: jobId }, data: { progress: 60 } });

          const files = parseCodeBlocks(result.text);
          for (const file of files) {
            const storageKey = `workspaces/${workspaceId}/code/${file.path}`;
            await saveFile(storageKey, file.content);

            await db.workspaceFile.upsert({
              where: { workspaceId_path: { workspaceId, path: file.path } },
              create: { workspaceId, path: file.path, type: "CODE", storageKey, size: Buffer.byteLength(file.content) },
              update: { storageKey, size: Buffer.byteLength(file.content) },
            });
          }

          await db.taskJob.update({
            where: { id: jobId },
            data: { status: "COMPLETED", progress: 100, result: { fileCount: files.length } },
          });

          await db.notification.create({
            data: {
              userId,
              type: "GENERATE_DONE",
              title: "代码生成完成",
              content: `项目「${workspace.name}」的代码已生成完成，共 ${files.length} 个文件。`,
            },
          });
          break;
        }

        case "thesis-gen": {
          const techStack = workspace.techStack as Record<string, string>;
          const techStr = Object.entries(techStack).map(([k, v]) => `${k}: ${v}`).join(", ");
          const requirements = (workspace.requirements as Requirements) || {};
          const roles = requirements.roles || [];
          const modules = requirements.modules || [];
          const tables = requirements.tables || [];

          // --- Step 1: Generate diagrams (20%) ---
          await db.taskJob.update({ where: { id: jobId }, data: { progress: 15 } });
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

          await db.taskJob.update({ where: { id: jobId }, data: { progress: 25 } });

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
            await db.taskJob.update({ where: { id: jobId }, data: { progress } });

            console.log(`[Worker] Generating chapter: ${ch.title} (${i + 1}/${chapters.length})`);

            const result = await generateText({
              model,
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
          await db.taskJob.update({ where: { id: jobId }, data: { progress: 90 } });
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
            data: { status: "COMPLETED", progress: 100, result: { chapters: chapters.length + 2, diagrams: diagramResult.svgs.length, tables: tableSchemas.length } },
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
          await db.taskJob.update({ where: { id: jobId }, data: { progress: 20 } });
          console.log("[Worker] Generating charts...");

          const { svgs } = await generateDiagramsPng(workspace);

          await db.taskJob.update({ where: { id: jobId }, data: { progress: 80 } });

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
            data: { status: "COMPLETED", progress: 100, result: { chartCount: svgs.length } },
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
            data: { status: "COMPLETED", progress: 100, result: { message: "预览功能已就绪" } },
          });
          break;
        }

        default:
          console.warn(`[Worker] Unknown job type: ${job.name}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Worker] Job ${jobId} failed:`, message);
      await db.taskJob.update({
        where: { id: jobId },
        data: { status: "FAILED", error: message },
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
