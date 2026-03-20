# 论文图表嵌入 - 任务列表

## 实现任务

- [x] T1: 创建图表生成器 `lib/chart/diagram-generator.ts`（从 requirements 确定性生成 Mermaid 代码）
- [x] T2: 实现用例功能图生成（graph LR：角色 → 模块 → 功能）
- [x] T3: 实现 ER 关系图生成（erDiagram：表 + 字段 + 外键关系推断）
- [x] T4: 实现系统架构图生成（graph TB：客户端 → 服务端 → 数据层，含子图）
- [x] T5: 内置常见表字段模板（users, books, borrow_records, orders, products, categories）
- [x] T6: 增强 chart/renderer.ts：添加 `renderMermaidToPng` 和 `svgToPng`（使用 sharp）
- [x] T7: 增强 docx-builder.ts：支持 ImageRun 插入图片（PNG buffer + 自动缩放）
- [x] T8: 增强 docx-builder.ts：支持 Table/TableRow/TableCell 生成数据库表结构表格
- [x] T9: 增强 docx-builder.ts：添加封面页（标题 + 作者 + 日期）
- [x] T10: 增强 docx-builder.ts：添加 TableOfContents 目录占位
- [x] T11: 增强 docx-builder.ts：支持三级标题（HeadingLevel 1/2/3）
- [x] T12: Worker thesis-gen：生成前先渲染 3 张图表（架构/ER/用例）
- [x] T13: Worker thesis-gen：增强各章 prompt（注入角色/模块/表字段信息，引导引用图表）
- [x] T14: Worker thesis-gen：新增参考文献和致谢章节
- [x] T15: Worker thesis-gen：图表 PNG + 表格数据传入 buildDocx
- [x] T16: 创建 generate-chart API 路由（独立图表生成入口）
- [x] T17: 启用前端"生成图表"按钮（去除 disabled + 接入 triggerGenerate）
- [x] T18: 修复 worker:dev 命令（--watch-path 限定监视范围，避免 .storage 写入触发重启）
- [x] T19: 端到端测试：论文生成 → 验证 DOCX 包含图表和表格（79KB vs 原 20KB）

## 修复记录

- **修复**: tsx --watch 被 .storage 写入触发重启中断任务 → package.json 改用 `--watch-path=worker --watch-path=lib`
