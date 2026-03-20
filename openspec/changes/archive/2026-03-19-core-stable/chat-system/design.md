# chat-system: 技术设计

## 前端架构
- 使用 `useChat` hook，自动处理流式渲染
- 打字机效果由 AI SDK 内置支持
- 消息列表按时间顺序展示，用户消息与 AI 消息区分样式

## 后端架构
- `app/api/chat/route.ts` 使用 `streamText` 处理请求
- 请求体包含：workspaceId、messages、可选 systemPrompt
- 响应为 Server-Sent Events (SSE) 流

## 消息持久化
- AI 响应完成后，在 `onFinish` 回调中批量写入数据库
- 用户消息在发送时立即写入
- 写入顺序：用户消息 → AI 消息

## 上下文窗口
- 最近 20 条消息作为 context 传入
- 系统 prompt 包含工作空间基本信息（选题、技术栈、需求清单摘要）
- 超出窗口的历史消息不加载，减少 token 消耗

## 数据流
```
用户输入 → useChat → POST /api/chat
                        ↓
              streamText (选模型、加载上下文)
                        ↓
              SSE 流式返回 → useChat 渲染
                        ↓
              onFinish → 写入 ChatMessage
```
