# Worker实际生成逻辑 - 功能规格

## 代码生成

1. 接收 workspace 信息（需求描述、技术栈等）
2. 调用 AI 生成代码
3. 解析 AI 输出中的文件块
4. 将文件存储到 OSS
5. 创建 WorkspaceFile 记录

## 论文生成

1. 按章节调用 AI 生成内容
2. 合并为完整文档
3. 生成 .docx 文件
4. 存储到 OSS

## 图表渲染

1. 调用 AI 生成 Mermaid 代码
2. 渲染为 PNG/SVG 图片
3. 存储到 OSS

## 任务进度

- 通过 TaskJob 表实时更新 progress 字段
- 前端可轮询获取进度

## 通知

- 任务完成后自动创建 Notification 记录
- 通知用户生成结果（成功/失败）
