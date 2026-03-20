# prompt-engineering: 需求规格

## 模板组织
- 每个任务类型一个 prompt 模板文件
- 统一放在 lib/ai/prompts/ 目录

## 模板能力
- **变量注入**：支持 {{variable}} 占位符，运行时替换为用户选题、技术栈、需求清单等
- **随机因子**：代码生成 prompt 注入随机因子（如变量命名风格、注释风格），降低查重率
- **版本管理**：prompt 支持版本标识，便于 A/B 测试和回滚

## 任务类型与模板

| 任务类型 | 模板文件 | 主要变量 |
|----------|----------|----------|
| 选题推荐 | topic-recommend.ts | 用户输入方向/关键词 |
| 需求展开 | requirement-expand.ts | 题目名称、技术栈 |
| 可行性评估 | feasibility-evaluate.ts | 需求清单、技术栈 |
| 代码生成 | code-generate.ts | 需求清单、技术栈、随机因子 |
| 论文生成 | thesis-generate.ts | 需求清单、题目、章节 |
| 图表生成 | chart-generate.ts | 需求描述、图表类型 |
| 修改 | modify.ts | 原内容、修改指令 |
| 答辩辅导 | defense-coach.ts | 项目信息、问题 |

## 代码生成防查重
- 随机因子：变量命名风格（驼峰/下划线）、注释密度、代码结构微调
- 每次生成时从预设池中随机选择组合
