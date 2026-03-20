# user-system: 需求规格
## 功能需求
### 注册
- 邮箱+密码注册
- 密码至少6位
- 邮箱唯一校验
- 注册成功自动登录
### 登录
- 邮箱+密码登录
- NextAuth.js Credentials Provider
- JWT 模式（不用数据库 session）
- 登录状态持久化
### 个人信息
- 查看/修改昵称
- 查看/修改头像
- 修改密码（需验证旧密码）
### 中间件保护
- /dashboard/** 路由需登录
- /admin/** 路由需 ADMIN 角色
- /api/** 部分接口需认证
## 接口设计
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/register | 注册 | 否 |
| POST | /api/auth/[...nextauth] | NextAuth 登录 | 否 |
| GET | /api/user/profile | 获取个人信息 | 是 |
| PATCH | /api/user/profile | 修改个人信息 | 是 |
| POST | /api/user/change-password | 修改密码 | 是 |
