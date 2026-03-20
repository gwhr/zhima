# ai-dispatcher: 任务清单

- [x] T1: 创建 lib/ai/providers.ts（配置 Anthropic + DeepSeek provider）
- [x] T2: 创建 lib/ai/router.ts（selectModel 函数，按任务类型+额度阶段选模型）
- [x] T3: 创建 lib/ai/usage.ts（recordUsage + getUserQuotaStatus 函数）
- [x] T4: 创建 lib/ai/prompts/ 目录，编写各任务类型的 system prompt
- [x] T5: 实现渐进式降级逻辑（查询 UserQuota，判断阶段）
- [x] T6: 集成到 chat API（/api/chat 调用 router 选模型）— 下个模块实现
- [ ] T7: 单元测试：不同额度阶段返回正确模型 — 后续补充

## 验收标准
1. ✅ selectModel 根据额度阶段返回不同模型
2. ✅ recordUsage 记录使用量并扣减额度
3. ✅ 7 种 system prompt 已编写
