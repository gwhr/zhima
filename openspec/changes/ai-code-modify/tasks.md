# AI 代码修改 - 任务列表

## 实现任务

- [x] T1: 增强 chat API system prompt，注入项目上下文（workspace + 代码文件内容）
- [x] T2: 修复 AI SDK v6 流式响应（toDataStreamResponse → toTextStreamResponse）
- [x] T3: 创建 apply-code API（文件写入 + 数据库 upsert）
- [x] T4: 创建 parse-ai-code-blocks 工具（解析 AI 返回的代码块 + 推断文件路径）
- [x] T5: 创建 ChatMessage 组件（Markdown 渲染 + 代码块高亮 + 应用按钮）
- [x] T6: 更新 ChatPanel 组件（纯文本流解析 + 传递 files/onFileApplied）
- [x] T7: 实现模糊文件匹配（basename + 类名/组件名内容匹配）
- [x] T8: 支持"保存为新文件"（当 AI 建议的文件不存在时）
- [x] T9: 增强初始代码生成的文件名提取（code-parser.ts 优化正则）
- [x] T10: 端到端测试（对话修改代码 → 一键应用 → 预览验证）

## 修复记录

- **修复**: AI SDK v6 的 `toDataStreamResponse` 不存在 → 改用 `toTextStreamResponse`
- **修复**: 前端流解析失败 → 去掉 `line.startsWith("0:")` 的 SSE JSON 解析，改为纯文本拼接
- **修复**: "应用修改"按钮不显示 → AI 建议路径（BookController.java）与存储路径（generated_X.java）不匹配，增强模糊匹配逻辑
