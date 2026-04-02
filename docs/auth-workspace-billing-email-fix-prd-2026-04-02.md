# Auth / Workspace / Billing 稳定性修复（2026-04-02）

## 背景

用户在最近线上回归中反馈 4 个问题：

1. 登录后看不到返回首页的明确入口。
2. 工作空间列表/详情页偶发“页面出错”。
3. Token 余额页偶发“加载账单数据失败”。
4. 邮箱注册缺少验证码校验，安全性不足。

本次改动聚焦“稳定可用 + 降低报错 + 注册安全补全”。

## 目标

1. 登录态下始终有清晰的“首页”入口。
2. 工作空间页在异常数据或接口失败时不崩溃。
3. 账单页改为分段容错，局部失败不影响整页。
4. 邮箱注册补齐“发送验证码 + 验证码校验 + 限流防刷”。

## 变更范围

### 1) 导航与首页可达性

- 仪表盘头部新增“返回首页”按钮。
- 顶部导航与侧边栏补充首页入口，登录后可随时跳回首页。

### 2) 工作空间稳定性

- 工作空间列表页增加 `normalizeWorkspace` 清洗逻辑。
- 工作空间详情页增加多层数据清洗：
  - workspace 基础字段
  - platform policy
  - 文件列表
  - 任务列表
  - token summary
- 接口异常时降级为空数据而非抛出全页错误。

### 3) Token 账单容错

- 前端账单页由 `Promise.all` 调整为 `Promise.allSettled`。
- 增加 JSON 解析与数组结构兜底。
- 单接口失败时显示“部分数据加载失败（具体模块）”。
- 后端接口兜底：
  - `P2021/P2022`（表/列未就绪）时，ledger 返回空数组。
  - token summary 返回默认预算 + 0 消耗。

### 4) 邮箱验证码注册

- 新增接口：`/api/auth/send-email-code`。
- 新增能力：`lib/email/provider.ts`。
- 注册页邮箱 Tab 增加“邮箱验证码”输入与发送按钮。
- 注册接口要求邮箱注册必须带 `emailCode`，并校验通过才可创建账号。
- 支持 mock/real 两种模式，real 模式走 SMTP。
- 增加邮箱维度与 IP 维度限流、防爆破与短时锁定。

## 环境变量新增

- `EMAIL_MODE`
- `EMAIL_COOLDOWN_SECONDS`
- `EMAIL_DAILY_LIMIT`
- `EMAIL_HOURLY_LIMIT`
- `EMAIL_IP_MINUTE_LIMIT`
- `EMAIL_IP_DAILY_LIMIT`
- `EMAIL_VERIFY_MAX_ATTEMPTS`
- `EMAIL_VERIFY_LOCK_SECONDS`
- `EMAIL_CODE_EXPIRE_SECONDS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

## 验收结果（本地）

1. `pnpm build` 通过。
2. 浏览器回归通过：
  - 登录后可从导航返回首页。
  - 工作空间列表与详情页可正常访问，不再进入错误页。
  - Token 页可展示数据，接口局部失败时不再整页崩溃。
  - 邮箱注册缺少或错误验证码时会被拦截。

## 风险与后续

1. 首页当前为营销页，已登录态仍显示“登录/注册”按钮（不影响可达性，但 UX 可继续优化为登录态头像入口）。
2. 生产环境启用邮箱验证码需正确配置 SMTP；否则会提示“通道未配置”。
3. 可补充 E2E 用例覆盖邮箱验证码注册与账单容错分支。
