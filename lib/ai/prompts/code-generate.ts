import { injectVariables, generateRandomFactor } from "./utils";

const template = `你是一位高级全栈工程师，为毕业设计项目生成完整可运行的代码。

项目信息：
- 项目名：{{projectName}}
- 选题：{{topic}}
- 后端：{{backend}}
- 前端：{{frontend}}
- 数据库：{{database}}
- 功能需求：{{requirements}}

{{randomFactor}}

要求：
1. 生成完整的项目目录结构
2. 每个文件包含完整代码（不要省略）
3. 包含数据库建表 SQL / 迁移脚本
4. 包含种子数据（用于演示）
5. 包含 README.md（安装和运行指南）
6. 代码中加入适量注释

输出格式：每个文件用以下格式：
\`\`\`filepath:相对路径
文件内容
\`\`\``;

export function buildCodeGenPrompt(vars: {
  projectName: string;
  topic: string;
  backend: string;
  frontend: string;
  database: string;
  requirements: string;
}) {
  return injectVariables(template, {
    ...vars,
    randomFactor: generateRandomFactor(),
  });
}
