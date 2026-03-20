# payment-system: 任务清单

- [x] T1: 创建 lib/payment/hupijiao.ts（虎皮椒 SDK 封装）
- [x] T2: 实现 POST /api/payment/create-order（创建订单 + 发起支付）
- [x] T3: 实现 POST /api/webhooks/payment（支付回调验签 + 订单状态更新）
- [x] T4: 回调成功后自动创建 UserQuota + 激活工作空间
- [x] T5: 实现 GET /api/orders（用户订单列表）
- [x] T6: 创建套餐选择页面（价格对比卡片）
- [x] T7: 创建支付中/支付成功页面

## 验收标准
1. 能选择套餐
2. 能扫码支付（微信/支付宝）
3. 回调更新订单状态
4. 自动获得额度
