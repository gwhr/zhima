# referral-system: 技术设计

## 数据模型
- InviteCode 表：userId, code（唯一）, createdAt
- Referral 表：inviterId, inviteeId, rewardAmount, createdAt（记录邀请关系与奖励）

## 邀请码生成
- 8 位随机字符串（字母+数字，排除易混淆字符）
- 注册时自动创建，与 User 一对一

## 注册流程扩展
```
POST /api/auth/register
Body: { email, password, inviteCode? }
→ 若 inviteCode 有效：创建 User + Referral 记录 + 双方发放额度
→ 若无效或为空：仅创建 User
```

## 额度发放
- 调用 billing-system 的额度增加接口
- 邀请人 +10，被邀请人 +10
- 需防重复：同一 inviteeId 仅发放一次

## 前端组件
- 邀请码展示卡片（复制按钮）
- 分享文案/链接生成
