# payment-system: 技术设计

## 目录结构
```
lib/payment/
├── hupijiao.ts      # 虎皮椒 SDK 封装
├── order.ts         # 订单创建、状态更新
└── webhook.ts       # 回调验签逻辑

app/api/
├── payment/
│   └── create-order/
│       └── route.ts
├── webhooks/
│   └── payment/
│       └── route.ts
└── orders/
    └── route.ts
```

## 虎皮椒 SDK (hupijiao.ts)
```typescript
createOrder(params: {
  amount: number,      // 金额（分）
  planType: PlanType,
  userId: string,
  workspaceId: string,
  returnUrl?: string,
  notifyUrl: string
}): Promise<{ payUrl: string, qrCode?: string, orderId: string }>
verifyCallback(payload: object, signature: string): boolean
```

## 数据模型
- **Order**：id, userId, workspaceId, planType, amount, status, hupijiaoOrderId, payUrl, createdAt, paidAt

## 核心流程

### 创建订单
1. 校验用户登录、套餐有效
2. 创建 Order 记录（status: PENDING）
3. 调用虎皮椒 API 获取支付链接/二维码
4. 更新 Order 的 payUrl、hupijiaoOrderId
5. 返回 payUrl 供前端跳转

### 支付回调
1. 接收虎皮椒 POST 请求
2. 验签（防止伪造）
3. 根据 hupijiaoOrderId 查找 Order
4. 更新 status 为 PAID，记录 paidAt
5. 调用 createUserQuota(userId, workspaceId, planType)
6. 返回 200 OK（虎皮椒要求）

### 与 billing-system 的集成
- 回调成功后调用 `createUserQuota` 创建额度
- 依赖 lib/billing/quota.ts

## 安全
- 回调验签必须通过，否则拒绝
- 幂等处理：已 PAID 的订单不再重复创建 UserQuota
