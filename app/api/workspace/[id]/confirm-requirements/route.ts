import { generateText } from "ai";
import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { getRuntimeModel } from "@/lib/ai/runtime-model";
import { buildFeasibilityPrompt } from "@/lib/ai/prompts/feasibility-evaluate";

type DifficultyAssessment = {
  academic: number;
  practical: number;
  difficulty: number;
  workload: string;
  innovation: number;
  overall: number;
  suggestions: string[];
};

type RequirementRole = { name: string; description: string };
type RequirementModule = { name: string; features: string[]; enabled: boolean };

type WorkspaceRequirements = {
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
};

function normalizeMajorCategory(value: unknown): "computer" | "non-computer" {
  return value === "non-computer" ? "non-computer" : "computer";
}

function getMajorCategoryLabel(majorCategory: "computer" | "non-computer"): string {
  return majorCategory === "non-computer" ? "非计算机专业" : "计算机相关专业";
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate || !candidate.trim()) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRequirements(raw: unknown): WorkspaceRequirements {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const majorCategory = normalizeMajorCategory(obj.majorCategory);

  const rolesRaw = Array.isArray(obj.roles) ? obj.roles : [];
  const modulesRaw = Array.isArray(obj.modules) ? obj.modules : [];

  const roles: RequirementRole[] = rolesRaw
    .map((role) => {
      if (!role || typeof role !== "object") return null;
      const item = role as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const description =
        typeof item.description === "string" ? item.description.trim() : "";
      if (!name) return null;
      return { name, description };
    })
    .filter((item): item is RequirementRole => item !== null);

  const modules: RequirementModule[] = modulesRaw
    .map((mod) => {
      if (!mod || typeof mod !== "object") return null;
      const item = mod as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const features = toStringArray(item.features);
      if (!name) return null;
      return {
        name,
        features,
        enabled: item.enabled !== false,
      };
    })
    .filter((item): item is RequirementModule => item !== null);

  return {
    summary: typeof obj.summary === "string" ? obj.summary : "",
    roles,
    modules,
    tables: toStringArray(obj.tables),
    majorCategory,
    majorCategoryLabel:
      typeof obj.majorCategoryLabel === "string" && obj.majorCategoryLabel.trim()
        ? obj.majorCategoryLabel.trim()
        : getMajorCategoryLabel(majorCategory),
    difficulty: typeof obj.difficulty === "number" ? obj.difficulty : undefined,
    feasibility: typeof obj.feasibility === "string" ? obj.feasibility : "",
    estimatedPages:
      typeof obj.estimatedPages === "number" ? obj.estimatedPages : undefined,
    estimatedApis:
      typeof obj.estimatedApis === "number" ? obj.estimatedApis : undefined,
    estimatedTables:
      typeof obj.estimatedTables === "number" ? obj.estimatedTables : undefined,
    estimatedWords:
      typeof obj.estimatedWords === "number" ? obj.estimatedWords : undefined,
  };
}

function normalizeAssessment(raw: unknown): DifficultyAssessment {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};

  const toScore = (value: unknown, fallback = 0) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return {
    academic: toScore(obj.academic, 3),
    practical: toScore(obj.practical, 3),
    difficulty: toScore(obj.difficulty, 3),
    workload:
      typeof obj.workload === "string" && obj.workload.trim()
        ? obj.workload.trim()
        : "8-12 周",
    innovation: toScore(obj.innovation, 3),
    overall: toScore(obj.overall, 6),
    suggestions: toStringArray(obj.suggestions),
  };
}

function buildMajorCategoryContext(majorCategory: "computer" | "non-computer"): string {
  if (majorCategory === "non-computer") {
    return "专业分类：非计算机专业。请按业务信息化系统思路评估，强调可交付性与答辩可解释性。";
  }
  return "专业分类：计算机相关专业。可按标准软件工程毕设要求评估。";
}

function buildDirectionScopeContext(): string {
  return "方向限制：当前平台仅支持信息系统/软件工程类毕设。若用户提出目标检测/模型训练等算法研究诉求，请转译为“结果管理与展示平台”方案，不要输出训练脚本或硬件方案。";
}

async function evaluateDifficulty(
  topic: string,
  techStack: Record<string, unknown>,
  requirements: WorkspaceRequirements
): Promise<DifficultyAssessment> {
  const techStackText = Object.entries(techStack)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(", ");

  const basePrompt = buildFeasibilityPrompt({
    topic,
    techStack: techStackText || "未指定",
    degree: "本科",
  });

  const context = `

补充上下文（请结合评估）：
- 需求摘要：${requirements.summary || "未提供"}
- 角色数：${requirements.roles?.length || 0}
- 功能模块数：${requirements.modules?.length || 0}
- 数据表数：${requirements.tables?.length || 0}
- ${buildMajorCategoryContext(requirements.majorCategory || "computer")}
- ${buildDirectionScopeContext()}
`;

  const model = await getRuntimeModel("glm");
  const { text } = await generateText({
    model,
    prompt: `${basePrompt}\n${context}`,
  });

  const parsed = extractJsonObject(text);
  return normalizeAssessment(parsed);
}

function buildRevisePrompt(
  topic: string,
  techStack: Record<string, unknown>,
  current: WorkspaceRequirements,
  userIdea: string
) {
  const techStackText = Object.entries(techStack)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(", ");

  return `你是毕业设计需求分析专家。请根据用户补充意见，重构项目需求并输出结构化 JSON。

项目题目：${topic}
技术栈：${techStackText || "未指定"}
${buildMajorCategoryContext(current.majorCategory || "computer")}
${buildDirectionScopeContext()}

当前需求（JSON）：
${JSON.stringify(current, null, 2)}

用户补充意见：
${userIdea}

请严格输出 JSON，不要输出其他文字。格式如下：
{
  "summary": "项目简介（100字以内）",
  "roles": [
    { "name": "角色名", "description": "角色职责描述" }
  ],
  "modules": [
    { "name": "模块名", "features": ["功能1", "功能2"], "enabled": true }
  ],
  "tables": ["表名1", "表名2"],
  "difficulty": 3,
  "feasibility": "可行性结论（50字以内）",
  "estimatedPages": 15,
  "estimatedApis": 30,
  "estimatedTables": 8,
  "estimatedWords": 15000
}`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action === "revise" ? "revise" : "confirm";
  const userIdea =
    typeof body?.userIdea === "string" ? body.userIdea.trim() : "";

  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  if (action === "revise") {
    const [codeJob, codeFile] = await Promise.all([
      db.taskJob.findFirst({
        where: { workspaceId: id, type: "CODE_GEN" },
        select: { id: true },
      }),
      db.workspaceFile.findFirst({
        where: { workspaceId: id, type: "CODE" },
        select: { id: true },
      }),
    ]);

    if (codeJob || codeFile) {
      return error("代码生成已开始，不能再重新调整并评估", 409);
    }
  }

  const currentRequirements = normalizeRequirements(workspace.requirements);
  let nextRequirements = currentRequirements;

  if (action === "revise") {
    if (!userIdea) return error("请输入你的修改想法", 400);

    const model = await getRuntimeModel("glm");
    const { text } = await generateText({
      model,
      prompt: buildRevisePrompt(
        workspace.topic,
        (workspace.techStack as Record<string, unknown>) || {},
        currentRequirements,
        userIdea
      ),
    });

    const parsed = extractJsonObject(text);
    if (!parsed) {
      return error("AI 需求解析失败，请重试", 502);
    }
    const revisedRequirements = normalizeRequirements(parsed);
    const majorCategory = currentRequirements.majorCategory || revisedRequirements.majorCategory || "computer";
    nextRequirements = {
      ...revisedRequirements,
      majorCategory,
      majorCategoryLabel: getMajorCategoryLabel(majorCategory),
    };
  }

  const assessment = await evaluateDifficulty(
    workspace.topic,
    (workspace.techStack as Record<string, unknown>) || {},
    nextRequirements
  );

  const merged: WorkspaceRequirements = {
    ...nextRequirements,
    featureConfirmed: true,
    featureConfirmedAt: new Date().toISOString(),
    featureConfirmAction: action,
    featureConfirmInput: action === "revise" ? userIdea : "",
    difficultyAssessment: assessment,
  };

  await db.workspace.update({
    where: { id },
    data: { requirements: merged },
  });

  return success({
    requirements: merged,
    assessment,
  });
}
