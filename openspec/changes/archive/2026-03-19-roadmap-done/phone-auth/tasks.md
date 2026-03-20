# 手机号注册登录 - 任务列表

## 实现任务

- [x] T1: 创建 lib/sms/provider.ts（短信发送封装，含模拟模式）
- [x] T2: 创建 POST /api/auth/send-code（发送验证码，Redis存储+冷却+防刷）
- [x] T3: 创建 POST /api/auth/verify-code（校验验证码）
- [x] T4: 修改 lib/auth.ts 新增 Phone Credentials Provider
- [x] T5: 创建随机昵称生成函数 lib/utils/name-generator.ts
- [x] T6: 修改注册页面，添加手机号+验证码表单（Tab切换邮箱/手机）
- [x] T7: 修改登录页面，添加手机号+验证码登录方式
- [x] T8: 测试完整注册→登录→获取profile流程

## 验收标准

1. 手机号+验证码注册成功，自动生成昵称
2. 开发模式验证码打印在终端
3. 60秒冷却、5分钟过期正常
4. 邮箱和手机号两种方式并存
