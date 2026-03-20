# 功能确认闸门 - 功能规格

## 用户流程

1. 用户进入工作空间详情页后，先看到“功能确认”卡片。
2. 用户可选择：
   - 确认当前功能：直接进入难度评估并标记已确认；
   - 修改功能：输入补充想法（例如新增角色/模块/最少表数），由 AI 重分析。
3. 系统返回结构化需求与难度评估，用户确认后可继续代码生成。

## 需求约束

- 未完成需求确认时，“生成代码”按钮需禁用或阻断并提示先确认。
- 难度评估结果需持久化到工作空间需求字段中，后续可回看。
- 修改需求后，页面应刷新展示最新角色、模块、表以及评估信息。

## AI 输出结构

重分析接口应输出 JSON（可扩展）：

- `summary`
- `roles[]`
- `modules[]`
- `tables[]`
- `difficulty`
- `feasibility`
- `estimatedPages`
- `estimatedApis`
- `estimatedTables`
- `estimatedWords`
- `difficultyAssessment`（academic/practical/difficulty/workload/innovation/overall/suggestions）

## 错误处理

- AI 解析失败：返回明确错误提示，不覆盖原需求。
- 用户输入为空：前端和后端双重校验。
- 非本人工作空间：返回 403。

