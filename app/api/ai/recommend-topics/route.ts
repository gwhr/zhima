import { generateText } from "ai";
import { requireAuth } from "@/lib/auth-helpers";
import { models } from "@/lib/ai/providers";

export async function POST(req: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { keyword } = await req.json();
  if (!keyword) {
    return Response.json({ success: false, error: "请输入关键词" }, { status: 400 });
  }

  const { text } = await generateText({
    model: models.glm,
    prompt: `你是毕业设计选题专家。用户输入了方向关键词："${keyword}"

请推荐 6 个适合本科毕业设计的题目。严格按以下 JSON 格式返回，不要有任何多余文字：

[
  {
    "title": "题目名称",
    "description": "一句话介绍这个项目是做什么的（30字以内）",
    "roles": "系统包含的角色，如：普通用户、管理员",
    "coreFeatures": "3-5个核心功能，用顿号分隔",
    "techStack": "推荐技术栈",
    "difficulty": 3
  }
]

difficulty 用 1-5 表示，1 最简单，5 最难。推荐的题目应该涵盖不同难度。
roles 要具体说明有哪些角色。
coreFeatures 要列出最核心的 3-5 个功能点，让学生一眼就能知道要做什么。`,
  });

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const topics = JSON.parse(jsonMatch[0]);
      return Response.json({ success: true, data: topics });
    }
    return Response.json({ success: true, data: [] });
  } catch {
    return Response.json({ success: true, data: [] });
  }
}
