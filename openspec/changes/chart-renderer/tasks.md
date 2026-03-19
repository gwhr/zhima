# chart-renderer: 任务清单

- [x] T1: 创建 lib/chart/mermaid-renderer.ts（调用 Mermaid CLI 或 Kroki API 渲染图片）
- [x] T2: 创建 lib/chart/plantuml-renderer.ts（PlantUML 渲染）
- [x] T3: 实现 POST /api/workspace/[id]/chart/render（接收图表代码→返回图片 URL）
- [x] T4: Worker 中添加 chart-render 任务处理器
- [x] T5: 集成到论文生成流程（自动渲染图表并插入 docx）

## 验收标准
输入 Mermaid 代码，能生成 PNG 图片并存储到 OSS

注：此模块为后期功能，当前为 API 骨架/占位实现。
