# billing-system: 任务清单

- [x] T1: 创建套餐配置常量 lib/billing/plans.ts
- [x] T2: 实现 GET /api/user/quota（查询当前额度和阶段）
- [x] T3: 实现 GET /api/user/usage（消耗明细列表，分页）
- [x] T4: 实现购买套餐后自动创建 UserQuota 的逻辑
- [x] T5: 创建用户中心额度展示组件
- [x] T6: 创建消耗明细页面

## 验收标准
1. 购买套餐后能看到额度
2. 每次 AI 调用后额度自动扣减
3. 消耗明细页面正确展示调用记录
