import { generateText } from "ai";
import { requireAuth } from "@/lib/auth-helpers";
import { getRuntimeModel } from "@/lib/ai/runtime-model";

type TopicSuggestion = {
  title: string;
  description: string;
  roles: string;
  coreFeatures: string;
  techStack: string;
  difficulty: number;
};

type MajorCategory = "computer" | "non-computer";

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

function clampDifficulty(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 3;
  return Math.max(1, Math.min(5, Math.round(value)));
}

function parseTopics(text: string, excludeTitles: string[]): TopicSuggestion[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const raw = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(raw)) return [];

    const excluded = new Set(excludeTitles.map(normalizeTitle));
    const seen = new Set<string>();
    const result: TopicSuggestion[] = [];

    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) continue;

      const normalized = normalizeTitle(title);
      if (excluded.has(normalized) || seen.has(normalized)) continue;
      seen.add(normalized);

      result.push({
        title,
        description:
          typeof item.description === "string" ? item.description.trim() : "",
        roles: typeof item.roles === "string" ? item.roles.trim() : "",
        coreFeatures:
          typeof item.coreFeatures === "string"
            ? item.coreFeatures.trim()
            : "",
        techStack: typeof item.techStack === "string" ? item.techStack.trim() : "",
        difficulty: clampDifficulty(item.difficulty),
      });
    }

    return result.slice(0, 6);
  } catch {
    return [];
  }
}

const blockedDirectionKeywords = [
  "目标检测",
  "图像识别",
  "语音识别",
  "深度学习",
  "神经网络",
  "模型训练",
  "yolo",
  "opencv",
  "pytorch",
  "tensorflow",
  "onnx",
  "机械臂",
  "单片机",
  "嵌入式",
  "硬件",
  "电路",
  "化学实验",
  "材料实验",
];

function isSoftwareDirectionTopic(topic: TopicSuggestion): boolean {
  const text = `${topic.title} ${topic.description} ${topic.coreFeatures} ${topic.techStack}`.toLowerCase();
  return !blockedDirectionKeywords.some((keyword) =>
    text.includes(keyword.toLowerCase())
  );
}

function buildFallbackTopics(
  keyword: string,
  majorCategory: MajorCategory,
  excludeTitles: string[]
): TopicSuggestion[] {
  const excluded = new Set(excludeTitles.map(normalizeTitle));
  const safeKeyword = keyword.replace(/\s+/g, " ").trim();
  const scene = safeKeyword || "校园";
  const base: TopicSuggestion[] = [
    {
      title: `${scene}业务管理系统`,
      description: "围绕核心业务流程实现用户端与管理端协同。",
      roles: "普通用户、管理员",
      coreFeatures: "账号登录、业务录入、状态跟踪、统计报表、后台配置",
      techStack: "Spring Boot + Vue3 + MySQL",
      difficulty: majorCategory === "non-computer" ? 2 : 3,
    },
    {
      title: `${scene}数据分析与可视化平台`,
      description: "提供数据采集、查询分析和图表看板能力。",
      roles: "数据录入员、运营人员、管理员",
      coreFeatures: "数据采集、条件检索、可视化看板、导出报表、权限管理",
      techStack: "Node.js + React + PostgreSQL",
      difficulty: majorCategory === "non-computer" ? 3 : 4,
    },
    {
      title: `${scene}预约与流程协同系统`,
      description: "支持预约、审批和流程留痕，便于答辩展示。",
      roles: "申请人、审核员、管理员",
      coreFeatures: "在线预约、流程审批、消息提醒、记录追踪、后台管理",
      techStack: "Spring Boot + Vue3 + MySQL",
      difficulty: 3,
    },
    {
      title: `${scene}小程序 + 后台管理平台`,
      description: "面向移动端场景，配套后台运营与数据管理。",
      roles: "小程序用户、运营人员、管理员",
      coreFeatures: "小程序交互、内容管理、订单/记录管理、数据统计、权限控制",
      techStack: "UniApp/小程序 + Java + MySQL",
      difficulty: majorCategory === "non-computer" ? 3 : 4,
    },
  ];

  return base
    .filter((item) => !excluded.has(normalizeTitle(item.title)))
    .slice(0, 6);
}

export async function POST(req: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await req.json();
  const keyword = typeof body?.keyword === "string" ? body.keyword.trim() : "";
  const majorCategory: MajorCategory =
    body?.majorCategory === "non-computer" ? "non-computer" : "computer";
  const excludeTitles = Array.isArray(body?.excludeTitles)
    ? body.excludeTitles
        .filter((item: unknown): item is string => typeof item === "string")
        .map((item: string) => item.trim())
        .filter(Boolean)
        .slice(0, 40)
    : [];
  const batchRaw = Number(body?.batch);
  const batch = Number.isFinite(batchRaw)
    ? Math.max(1, Math.min(20, Math.floor(batchRaw)))
    : 1;

  if (!keyword) {
    return Response.json({ success: false, error: "请输入关键词" }, { status: 400 });
  }

  const categoryPrompt =
    majorCategory === "non-computer"
      ? `
专业分类：非计算机专业。
请优先推荐“业务信息化系统”方向题目（如管理系统、数据分析看板、流程平台、小程序），确保实现复杂度适中，适合非计算机背景同学完成与答辩。`
      : `
专业分类：计算机相关专业。
可以覆盖常见软件工程方向题目，兼顾工程实践与技术深度。`;

  const directionPrompt = `
方向限制（必须遵守）：
1. 仅推荐“信息系统/软件工程类”毕设题目，聚焦 Web/小程序 + 后台管理、业务流程和数据管理。
2. 题目需可落地为“用户端 + 管理端”或“业务端 + 管理端”系统。
3. 不要推荐纯算法研究、模型训练、硬件控制或实验类题目（如目标检测、图像识别训练、嵌入式硬件）。
4. 若关键词偏算法方向，请转译为“算法结果管理与展示平台”类型题目。`;

  const excludePrompt =
    excludeTitles.length > 0
      ? `
这是补充推荐（第 ${batch} 批）。请务必与以下已推荐题目不重复：
${excludeTitles.map((title: string) => `- ${title}`).join("\n")}
并尽量覆盖不同细分方向，不要只做改词。`
      : `
这是首批推荐（第 1 批），请保证题目有差异化，覆盖不同实现方向。`;

  const model = await getRuntimeModel("glm");
  const { text } = await generateText({
    model,
    temperature: 0.9,
    prompt: `你是毕业设计选题专家。用户输入了方向关键词："${keyword}"
${categoryPrompt}
${excludePrompt}
${directionPrompt}

请推荐 6 个适合本科毕业设计的题目。严格按以下 JSON 格式返回，不要有任何多余文字：

[
  {
    "title": "题目名称",
    "description": "一句话介绍这个项目是做什么的（40字以内）",
    "roles": "系统包含的角色，如：普通用户、管理员",
    "coreFeatures": "3-5个核心功能，用顿号分隔",
    "techStack": "推荐技术栈",
    "difficulty": 3
  }
]

difficulty 用 1-5 表示，1 最简单，5 最难。推荐题目要有难度梯度。
roles 要具体说明有哪些角色。
coreFeatures 要列出最核心的 3-5 个功能点，让学生一眼知道要做什么。`,
  });

  const parsedTopics = parseTopics(text, excludeTitles);
  const normalizedSeen = new Set<string>();

  const scopedTopics = parsedTopics.filter((item) => {
    if (!isSoftwareDirectionTopic(item)) return false;
    const key = normalizeTitle(item.title);
    if (normalizedSeen.has(key)) return false;
    normalizedSeen.add(key);
    return true;
  });

  let topics = scopedTopics;
  if (topics.length < 6) {
    const fallback = buildFallbackTopics(keyword, majorCategory, [
      ...excludeTitles,
      ...topics.map((item) => item.title),
    ]);
    topics = [...topics, ...fallback].slice(0, 6);
  }

  return Response.json({ success: true, data: topics });
}
