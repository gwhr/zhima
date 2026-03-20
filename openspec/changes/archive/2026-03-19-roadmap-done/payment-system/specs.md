# payment-system: 需求规格

## 虎皮椒 API 接入
- 使用虎皮椒聚合支付 API
- 支持微信扫码、支付宝扫码
- 需配置 app_id、app_secret、回调地址

## 下单流程
```
选套餐 → 创建订单 → 跳转支付 → 用户扫码付款 → 虎皮椒回调 → 验签确认 → 更新订单状态 → 激活工作空间 + 创建 UserQuota
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/payment/create-order | 创建订单并发起支付，返回支付链接/二维码 |
| POST | /api/webhooks/payment | 虎皮椒支付回调（验签 + 订单状态更新） |
| GET | /api/orders | 用户订单列表，支持分页 |

## 订单状态
- PENDING：待支付
- PAID：已支付
- FAILED：支付失败
- REFUNDED：已退款
- EXPIRED：已过期

## 回调后处理
- 验签通过后，将订单状态更新为 PAID
- 自动创建 UserQuota 记录（调用 billing-system 逻辑）
- 激活对应工作空间（如有）
