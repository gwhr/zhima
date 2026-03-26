import { generateText } from "ai";
import { requireAuth } from "@/lib/auth-helpers";
import { getRuntimeModel } from "@/lib/ai/runtime-model";

export async function POST(req: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await req.json();
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
  const techStack =
    body?.techStack && typeof body.techStack === "object" ? body.techStack : {};
  const majorCategory =
    body?.majorCategory === "non-computer" ? "non-computer" : "computer";

  if (!topic) {
    return Response.json({ success: false, error: "请输入选题" }, { status: 400 });
  }

  const techStr = techStack
    ? Object.entries(techStack).map(([k, v]) => `${k}: ${v}`).join(", ")
    : "未指定";

  const categoryPrompt =
    majorCategory === "non-computer"
      ? `
专业分类：非计算机专业。
请将需求设计为“业务信息化系统”风格，强调业务流程与可展示性，避免过深的底层算法或分布式架构复杂度。`
      : `
专业分类：计算机相关专业。
需求可包含标准的软件工程实践内容，兼顾功能完整性与工程实现。`;

  const model = await getRuntimeModel("glm");

  const { text } = await generateText({
    model,
    prompt: `你是毕业设计需求分析专家。请为以下选题生成需求清单。

选题：${topic}
技术栈：${techStr}
${categoryPrompt}

请严格按以下 JSON 格式返回，不要有任何多余文字：

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
}`,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return Response.json({ success: true, data: result });
    }
    return Response.json({ success: false, error: "AI 返回格式异常" });
  } catch {
    return Response.json({ success: false, error: "AI 返回解析失败" });
  }
}
