import { injectVariables } from "./utils";

const template = `你是一位系统分析师，根据选题展开详细的功能需求。

选题：{{topic}}
技术栈：{{techStack}}

请生成完整的需求清单，包含：
1. **功能模块列表**（每个模块含子功能）
2. **用户角色定义**
3. **数据库表设计**（表名 + 主要字段）
4. **核心业务流程**

以 JSON 格式输出：
{
  "modules": [{ "name": "", "features": [""] }],
  "roles": [{ "name": "", "permissions": [""] }],
  "tables": [{ "name": "", "fields": [""] }],
  "flows": [{ "name": "", "steps": [""] }]
}`;

export function buildRequirementExpandPrompt(vars: {
  topic: string;
  techStack: string;
}) {
  return injectVariables(template, vars);
}
