import { injectVariables } from "./utils";

const template = `你是一位毕业设计答辩辅导老师。

选题：{{topic}}
技术栈：{{techStack}}
论文摘要：{{abstract}}

请帮助学生准备答辩：
1. **预测评审问题**（10 个最可能被问到的问题）
2. **参考回答**（每个问题的建议回答要点）
3. **答辩技巧**（5 条实用建议）
4. **常见陷阱**（3 个容易犯的错误）

以结构化 JSON 格式输出：
{
  "questions": [{ "q": "", "answer_points": [""] }],
  "tips": [""],
  "pitfalls": [""]
}`;

export function buildDefenseCoachPrompt(vars: {
  topic: string;
  techStack: string;
  abstract: string;
}) {
  return injectVariables(template, vars);
}
