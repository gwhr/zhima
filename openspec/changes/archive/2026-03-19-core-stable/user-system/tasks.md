# user-system: 任务清单
- [x] T1: 配置 NextAuth.js（lib/auth.ts + app/api/auth/[...nextauth]/route.ts）
- [x] T2: 实现注册接口 POST /api/auth/register（邮箱唯一校验 + bcrypt 哈希）
- [x] T3: 实现 Credentials Provider（邮箱+密码验证）
- [x] T4: 配置 JWT callback 和 session callback（注入 userId, role）
- [x] T5: 创建 middleware.ts（保护 /dashboard 和 /admin 路由）
- [x] T6: 实现 GET /api/user/profile
- [x] T7: 实现 PATCH /api/user/profile
- [x] T8: 实现 POST /api/user/change-password
- [x] T9: 创建注册页面 app/(auth)/register/page.tsx
- [x] T10: 创建登录页面 app/(auth)/login/page.tsx
- [x] T11: 安装 shadcn/ui 表单组件（Input, Button, Card, Label）
## 验收标准
1. ✅ 能注册新用户（POST /api/auth/register 返回 201）
2. ✅ 重复注册返回 409
3. ✅ 未登录访问 /api/user/profile 返回 401
4. ✅ /dashboard 路由受 middleware 保护
