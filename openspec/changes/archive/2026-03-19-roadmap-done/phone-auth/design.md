# 手机号注册登录 - 技术设计

## 验证码存储

- Redis key: `sms:verify:{phone}`
- Value: 6位验证码
- TTL: 300s（5分钟）

## 冷却控制

- Redis key: `sms:cooldown:{phone}`
- Value: 1
- TTL: 60s

## 防刷限制

- Redis key: `sms:daily:{phone}:{date}`
- Value: 发送计数
- TTL: 86400s
- 阈值: 同一手机号每天最多10条

## 短信发送封装

`lib/sms/provider.ts`:
- 统一短信发送接口
- 开发模式 (`NODE_ENV=development`): `console.log` 打印验证码
- 生产模式: 调用短信宝 API (`http://api.smsbao.com/sms`)

## NextAuth 集成

- 新增 Phone Credentials Provider
- 在 `lib/auth.ts` 中配置
- 验证流程: 接收 phone + code → Redis 校验 → 查找/创建用户 → 返回 session

## 昵称生成

`lib/utils/name-generator.ts`:
- 格式: `智码用户_XXXX`（XXXX 为4位随机数字）
- 注册时自动分配
