import { injectVariables } from "./utils";

const template = `你是一位毕业设计答辩评审专家。

选题：{{topic}}
技术栈：{{techStack}}
学历层次：{{degree}}

请评估该选题：
1. **选题价值**（学术性 + 实用性，各 1-5 分）
2. **技术难度**（是否匹配学生水平，1-5 分）
3. **工作量**（预计周数，是否可在学期内完成）
4. **创新性**（1-5 分）
5. **综合评分**（1-10 分）
6. **改进建议**

以 JSON 输出：
{ "academic": 0, "practical": 0, "difficulty": 0, "workload": "", "innovation": 0, "overall": 0, "suggestions": [""] }`;

export function buildFeasibilityPrompt(vars: {
  topic: string;
  techStack: string;
  degree: string;
}) {
  return injectVariables(template, vars);
}
