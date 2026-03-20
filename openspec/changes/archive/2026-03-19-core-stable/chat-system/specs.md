# chat-system: 需求规格

## 技术选型
- 前端：Vercel AI SDK 的 `useChat` hook
- 后端：Vercel AI SDK 的 `streamText`
- 消息存储：ChatMessage 表

## 上下文隔离
- 每个工作空间独立对话上下文
- 工作空间内的对话互不干扰

## 能力扩展
- 支持 AI 工具调用（修改代码、生成图表等）
- 工具调用结果通过 metadata 字段存储

## 接口设计

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/chat | 流式对话（SSE） |
| GET | /api/workspace/[id]/messages | 获取工作空间历史消息 |

## 数据模型（ChatMessage）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| workspaceId | String | 所属工作空间 |
| role | Enum (USER, ASSISTANT, SYSTEM) | 角色 |
| content | Text | 消息内容 |
| metadata | Json? | 附加数据（工具调用结果等） |
| createdAt | DateTime | 创建时间 |
