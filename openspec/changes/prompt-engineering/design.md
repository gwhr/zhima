# prompt-engineering: 技术设计

## 目录结构
```
lib/ai/prompts/
├── utils.ts              # 变量注入、随机因子生成
├── topic-recommend.ts    # 选题推荐
├── requirement-expand.ts # 需求展开
├── feasibility-evaluate.ts
├── code-generate.ts      # 代码生成（含随机因子）
├── thesis-generate.ts    # 论文生成（分章节）
├── chart-generate.ts     # 图表 Mermaid/PlantUML
├── modify.ts             # 代码/论文修改
└── defense-coach.ts      # 答辩辅导
```

## 工具函数 (utils.ts)
```typescript
// 变量注入：将 { topic, techStack } 替换到模板中的 {{topic}} {{techStack}}
injectVariables(template: string, vars: Record<string, string>): string

// 随机因子生成：用于代码生成防查重
getRandomFactors(): {
  namingStyle: 'camelCase' | 'snake_case',
  commentDensity: 'minimal' | 'normal' | 'detailed',
  structureVariant: string
}
```

## 模板导出格式
每个模板文件导出：
```typescript
export const TOPIC_RECOMMEND_PROMPT = `
你是一个毕设选题推荐专家...
用户输入：{{userInput}}
...
`;

export function getTopicRecommendPrompt(vars: { userInput: string }) {
  return injectVariables(TOPIC_RECOMMEND_PROMPT, vars);
}
```

## 代码生成随机因子
- namingStyle：影响变量命名（userId vs user_id）
- commentDensity：影响注释数量
- structureVariant：影响文件组织、函数拆分方式
- 在 code-generate.ts 中调用 getRandomFactors() 注入到 prompt

## 论文分章节
- thesis-generate.ts 支持 chapter 参数
- 各章节：摘要、绪论、需求分析、系统设计、实现、测试、总结、参考文献
- 每个章节有独立 prompt 片段，可组合
