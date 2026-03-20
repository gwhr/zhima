# 通知系统前端 - 技术设计

## 组件结构

```
components/
  notification/
    ├── NotificationBell.tsx     # 铃铛图标 + 未读数 badge
    ├── NotificationPanel.tsx    # 下拉通知面板
    └── NotificationItem.tsx     # 单条通知项
```

## 状态管理

- 使用 SWR 或 React Query 管理通知数据
- 轮询间隔: 30秒

## API 依赖

- GET /api/notifications（获取通知列表）
- PATCH /api/notifications/[id]/read（标记单条已读）
- PATCH /api/notifications/read-all（全部已读）

## 通知类型映射

| 类型 | 图标 | 颜色 |
|------|------|------|
| GENERATION_COMPLETE | CheckCircle | green |
| QUOTA_WARNING | AlertTriangle | yellow |
| EXPIRY_REMINDER | Clock | red |
| SYSTEM | Info | blue |
