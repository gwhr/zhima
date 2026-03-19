# user-system: 技术设计
## 认证方案
- NextAuth.js v5 (Auth.js)
- Credentials Provider（邮箱+密码）
- JWT 策略，token 中包含 userId 和 role
- session callback 注入自定义字段
## 密码处理
- bcrypt 加盐哈希，12 rounds
- 注册时哈希存储，登录时 compare
## 中间件
- Next.js middleware.ts 全局路由保护
- matcher 配置保护路由
