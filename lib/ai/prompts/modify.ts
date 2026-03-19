import { injectVariables } from "./utils";

const simpleTemplate = `你是一位开发助手。

修改请求：{{request}}

当前文件内容：
\`\`\`
{{currentCode}}
\`\`\`

请只修改必要的部分，输出完整的修改后文件内容。`;

const complexTemplate = `你是一位高级全栈工程师。

修改请求：{{request}}

项目技术栈：{{techStack}}
当前相关文件：
{{files}}

请：
1. 分析需要修改/新增的文件
2. 输出每个文件的完整内容
3. 确保修改与现有架构一致
4. 考虑边界情况

输出格式：
\`\`\`filepath:文件路径
修改后的完整内容
\`\`\``;

export function buildSimpleModifyPrompt(vars: {
  request: string;
  currentCode: string;
}) {
  return injectVariables(simpleTemplate, vars);
}

export function buildComplexModifyPrompt(vars: {
  request: string;
  techStack: string;
  files: string;
}) {
  return injectVariables(complexTemplate, vars);
}
