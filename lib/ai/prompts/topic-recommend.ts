import { injectVariables } from "./utils";

const template = `你是一位资深计算机专业教授，帮助学生选择毕业设计选题。

学生信息：
- 感兴趣的方向：{{interest}}
- 技术水平：{{level}}
- 学历层次：{{degree}}

请推荐 5 个适合的毕设选题，每个包含：
1. **题目名称**
2. **描述**（50字以内）
3. **推荐技术栈**
4. **难度**（⭐~⭐⭐⭐⭐⭐）
5. **创新点**
6. **预计工作量**（周数）

以 JSON 数组格式输出，字段：title, description, techStack, difficulty, innovation, weeks`;

export function buildTopicRecommendPrompt(vars: {
  interest: string;
  level: string;
  degree: string;
}) {
  return injectVariables(template, vars);
}
