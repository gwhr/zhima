# chat-system: 任务清单

- [x] T1: 创建 POST /api/chat/route.ts（streamText + SSE）
- [x] T2: 创建 GET /api/workspace/[id]/messages/route.ts
- [x] T3: 创建对话 UI 组件（消息气泡、输入框、发送按钮）
- [x] T4: 集成 useChat hook
- [x] T5: 实现消息持久化（onFinish 回调写数据库）
- [x] T6: 实现上下文管理（加载历史消息作为 context）
- [x] T7: 添加 loading 状态和错误处理

## 验收标准
1. ✅ 能在工作空间中与 AI 对话（streamText + SSE）
2. ✅ 流式输出，打字机效果（useChat hook）
3. ✅ 刷新页面后历史消息仍在（数据库持久化）
4. ✅ 每个工作空间对话独立（workspaceId 隔离）
