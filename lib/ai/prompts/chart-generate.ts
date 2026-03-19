import { injectVariables } from "./utils";

const template = `你是一位技术架构师，负责生成毕业设计中的技术图表。

项目信息：
- 选题：{{topic}}
- 技术栈：{{techStack}}
- 功能模块：{{modules}}

需要生成的图表类型：{{chartType}}

请使用 Mermaid 语法生成图表，确保：
1. 语法完全正确，可直接渲染
2. 节点命名清晰，使用中文
3. 布局合理，不要过于拥挤
4. 关系描述准确

只输出 Mermaid 代码块，不需要其他解释。`;

export const chartTypes = {
  architecture: "系统架构图（展示前端、后端、数据库、外部服务的关系）",
  er: "ER 图（展示所有数据库表及其关系）",
  usecase: "用例图（展示各角色与功能的关系）",
  flowchart: "业务流程图（展示核心业务的流转过程）",
  sequence: "时序图（展示关键操作的交互流程）",
  class: "类图（展示后端核心类及其关系）",
} as const;

export function buildChartPrompt(vars: {
  topic: string;
  techStack: string;
  modules: string;
  chartType: keyof typeof chartTypes;
}) {
  return injectVariables(template, {
    ...vars,
    chartType: chartTypes[vars.chartType],
  });
}
