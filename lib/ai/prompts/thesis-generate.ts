import { injectVariables } from "./utils";

const template = `你是一位学术论文写作专家，帮助撰写计算机专业毕业论文。

选题：{{topic}}
技术栈：{{techStack}}
功能模块：{{modules}}
当前章节：{{chapter}}

要求：
1. 语言学术化、严谨，避免口语化
2. 段落层次清晰，使用合适的标题层级
3. 技术描述准确，包含必要的公式/算法说明
4. 引用 3-5 篇相关参考文献（格式：[序号] 作者, 标题, 期刊/会议, 年份）
5. 字数：本章节约 {{wordCount}} 字

章节要求：
{{chapterRequirement}}`;

export const chapterRequirements: Record<string, string> = {
  abstract: "撰写中英文摘要，中文 300-500 字，包含研究背景、方法、结果、关键词",
  introduction: "撰写引言/绪论，包含研究背景、国内外研究现状、研究意义、论文结构",
  requirements: "撰写需求分析章节，包含系统功能需求、非功能需求、用例分析",
  design: "撰写系统设计章节，包含总体架构、数据库设计、接口设计、模块设计",
  implementation: "撰写系统实现章节，包含开发环境、核心模块实现、关键代码说明",
  testing: "撰写系统测试章节，包含测试环境、测试用例、测试结果分析",
  conclusion: "撰写总结与展望，包含工作总结、不足之处、未来改进方向",
};

export function buildThesisPrompt(vars: {
  topic: string;
  techStack: string;
  modules: string;
  chapter: string;
  wordCount: string;
}) {
  return injectVariables(template, {
    ...vars,
    chapterRequirement: chapterRequirements[vars.chapter] || "",
  });
}
