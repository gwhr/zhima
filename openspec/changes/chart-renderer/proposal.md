# chart-renderer: 图表渲染器

## 目标
将 AI 生成的 Mermaid/PlantUML 代码渲染成图片，插入论文。支持架构图、ER 图、用例图、流程图、模块图。

## 技术方案
- 使用 Mermaid CLI 或 Kroki API 进行渲染
- 渲染结果存储到 OSS，返回图片 URL

## 交付物
- Mermaid 图表渲染（架构图、ER 图、用例图、流程图、模块图）
- PlantUML 图表渲染
- 图表渲染 API
- 与论文生成流程集成（自动渲染图表并插入 docx）

## 优先级
🟠 P1 — 第二批
