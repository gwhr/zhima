# 管理后台前端 - 技术设计

## 布局

- 侧边栏导航：看板 / 用户 / 订单 / AI用量
- 顶部标题栏：当前页面名称 + 管理员信息

## 组件

- 统计卡片：shadcn/ui Card
- 趋势图：recharts 或 chart.js
- 数据表格：shadcn/ui DataTable（基于 @tanstack/react-table）
- 搜索/筛选：shadcn/ui Input + Select

## 路由

```
/admin              → 数据看板
/admin/users        → 用户管理
/admin/orders       → 订单管理
/admin/ai-usage     → AI用量统计
```

## API 依赖

- GET /api/admin/stats（看板数据）
- GET /api/admin/users（用户列表）
- PATCH /api/admin/users/[id]（禁用/启用）
- GET /api/admin/orders（订单列表）
- POST /api/admin/orders/[id]/refund（退款）
- GET /api/admin/ai-usage（用量统计）
