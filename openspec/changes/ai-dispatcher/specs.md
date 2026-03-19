# ai-dispatcher: 需求规格

## 任务类型枚举
| 枚举值 | 说明 | 默认模型 |
|--------|------|----------|
| TOPIC | 选题推荐 | DeepSeek V3 |
| EVALUATE | 可行性评估 | DeepSeek V3 |
| CODE_GEN | 代码生成 | Opus 4.6 |
| THESIS | 论文正文生成 | DeepSeek V3 |
| CHART | 图表生成 | Opus 4.6 |
| MODIFY_SIMPLE | 简单修改（文案/样式） | DeepSeek V3 |
| MODIFY_COMPLEX | 复杂修改（加功能） | Opus 4.6 |

## 模型分配规则（参考产品方案 7.1 节）

| 任务 | 正常阶段 | 收紧阶段 | 经济阶段 |
|------|----------|----------|----------|
| 代码生成 | Opus 4.6 | Opus 4.6 | DeepSeek V3 |
| 图表生成 | Opus 4.6 | DeepSeek V3 | DeepSeek V3 |
| 复杂修改 | Opus 4.6 | DeepSeek V3 | DeepSeek V3 |
| 其他 | DeepSeek V3 | DeepSeek V3 | DeepSeek V3 |

## 三阶段降级
| 阶段 | 额度消耗 | 策略 |
|------|----------|------|
| 正常 (normal) | 0% ~ 60% | 代码/图表/复杂修改 → Opus |
| 收紧 (tightened) | 60% ~ 90% | 仅代码生成 → Opus |
| 经济 (economy) | 90% ~ 100% | 全部 → DeepSeek |
| 超额 | > 100% | 提示升级或购买额度 |

## 消耗记录
- 每次调用记录到 AiUsageLog 表
- 字段：userId, workspaceId, taskType, model, inputTokens, outputTokens, costYuan, durationMs

## 调用方式
- 内部模块调用，不直接暴露 API
- 其他模块通过 `lib/ai/router.ts` 获取模型，再调用对应 provider
