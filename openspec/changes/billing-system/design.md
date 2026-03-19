# billing-system: 技术设计

## 目录结构
```
lib/billing/
├── plans.ts         # 套餐配置常量
├── quota.ts         # 额度查询、扣减逻辑
└── usage.ts         # 消耗记录查询
```

## 套餐配置 (plans.ts)
```typescript
export const BILLING_PLANS = {
  BASIC: { price: 49, opusBudget: 25, modifyLimit: 10, previewLimit: 3, validDays: 30 },
  STANDARD: { price: 99, opusBudget: 50, modifyLimit: 50, previewLimit: -1, validDays: 90 },
  FLAGSHIP: { price: 199, opusBudget: 100, modifyLimit: -1, previewLimit: -1, validDays: -1 }
}
```
- `-1` 表示不限

## 数据模型
- **UserQuota**：userId, workspaceId, planType, opusBudget, opusUsed, modifyUsed, modifyLimit, previewUsed, previewLimit, expiresAt
- **AiUsageLog**：已有，由 ai-dispatcher 写入

## 核心函数

### quota.ts
```typescript
getUserQuota(userId: string, workspaceId: string): Promise<UserQuota | null>
createUserQuota(userId: string, workspaceId: string, planType: PlanType): Promise<UserQuota>
deductOpus(userId: string, workspaceId: string, amount: number): Promise<void>
deductModify(userId: string, workspaceId: string): Promise<boolean>
deductPreview(userId: string, workspaceId: string): Promise<boolean>
```

### usage.ts
```typescript
getUsageList(userId: string, workspaceId: string, page: number, pageSize: number): Promise<UsageRecord[]>
```

## API 路由
- `app/api/user/quota/route.ts` → GET，返回当前额度、阶段、剩余修改/预览次数
- `app/api/user/usage/route.ts` → GET，分页返回 AiUsageLog 记录

## 与 ai-dispatcher 的集成
- ai-dispatcher 的 getUserQuotaStatus 依赖 UserQuota 表
- 每次 AI 调用完成后，ai-dispatcher 的 recordUsage 写入 AiUsageLog，同时需调用 deductOpus 扣减额度
