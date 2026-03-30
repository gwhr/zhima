# 短信验证码正式接入说明

## 1. 需要做的配置

在生产环境变量中配置：

```env
SMS_MODE=real
SMSBAO_USER=你的短信宝账号
SMSBAO_API_KEY=你的短信宝API密钥
```

可选风控参数（有默认值）：

```env
SMS_COOLDOWN_SECONDS=60
SMS_PHONE_HOURLY_LIMIT=5
SMS_PHONE_DAILY_LIMIT=10
SMS_IP_MINUTE_LIMIT=20
SMS_IP_DAILY_LIMIT=200
SMS_VERIFY_MAX_ATTEMPTS=8
SMS_VERIFY_LOCK_SECONDS=900
```

## 2. 当前实现的防刷策略

- 单手机号冷却：默认 60 秒
- 单手机号小时上限：默认 5 次
- 单手机号日上限：默认 10 次
- 单 IP 分钟上限：默认 20 次
- 单 IP 日上限：默认 200 次
- 验证码输错防爆破：默认连续 8 次失败后锁定 15 分钟

接口命中限流时返回 HTTP `429`。

## 3. 上线前建议

- 将短信模板改为备案通过的正式签名/模板内容
- 在网关层再加一层限流（Nginx/WAF）
- 对短信发送记录做告警（异常高峰）
- 生产环境必须关闭 `SMS_MODE=mock`

