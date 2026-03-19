# ai-dispatcher: 技术设计

## 目录结构
```
lib/ai/
├── router.ts        # 核心路由：selectModel(taskType, userQuota) => model
├── providers.ts     # Anthropic + DeepSeek provider 配置
├── usage.ts         # 记录和查询消耗
└── prompts/         # 各任务类型的 system prompt 模板
    ├── topic.ts
    ├── evaluate.ts
    ├── code-gen.ts
    ├── thesis.ts
    ├── chart.ts
    └── modify.ts
```

## 核心函数

### router.ts
```typescript
selectModel(taskType: TaskType, quotaStatus: QuotaStatus): Model
```
- 输入：任务类型 + 用户额度状态（opusUsed/opusBudget, phase）
- 输出：'anthropic/claude-sonnet-4' | 'deepseek/deepseek-chat'
- 逻辑：查表决定，无外部调用

### usage.ts
```typescript
recordUsage(params: { userId, workspaceId, taskType, model, inputTokens, outputTokens, costYuan, durationMs }): Promise<void>
getUserQuotaStatus(userId: string, workspaceId: string): Promise<QuotaStatus>
```
- recordUsage：写入 AiUsageLog
- getUserQuotaStatus：查 UserQuota，计算 phase（normal/tightened/economy）

### providers.ts
- 配置 Anthropic provider（Opus 4.6）
- 配置 DeepSeek provider（V3）
- 导出 createAnthropic、createDeepSeek 供 streamText 使用

## 调用流程
```
业务层（如 /api/chat）
    ↓
getUserQuotaStatus(userId, workspaceId)
    ↓
selectModel(taskType, quotaStatus)
    ↓
根据 model 选择 provider → streamText(...)
    ↓
onFinish → recordUsage(...)
```
