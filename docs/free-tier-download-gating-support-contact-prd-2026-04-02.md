# 免费体验与付费解锁（下载卡点）+ 一对一辅导卡片

日期：2026-04-02  
状态：已落地（本地）

## 目标

在不影响现有生成与预览链路的前提下，强化「免费可体验、付费解锁成品」策略：

1. 免费用户可创建工作空间与体验生成/预览，但限制可创建工作空间数量。
2. 完整文件下载（代码/论文/图表压缩包）作为关键卡点，要求用户先充值一次。
3. 工作空间右侧增加「一对一辅导」卡片，支持管理员在后台配置文案与二维码。
4. 保留并继续使用现有后台队列保护（生成任务、运行预览队列）。

## 改动范围

### 1) 平台配置扩展（管理员可配）

新增配置项（`platform:settings`）：

- `freeWorkspaceLimit`：免费用户可创建工作空间上限（默认 3）
- `requireRechargeForDownload`：是否要求先充值后下载完整包（默认 true）
- `supportContactEnabled`：是否显示辅导卡片（默认 false）
- `supportContactTitle`：辅导卡片标题
- `supportContactDescription`：辅导卡片描述
- `supportContactQrUrl`：辅导二维码地址

相关文件：

- `lib/system-config.ts`
- `app/api/admin/platform-config/route.ts`
- `app/admin/platform/page.tsx`
- `.env.example`
- `.env.production.example`

### 2) 免费用户工作空间数量限制

在创建工作空间接口新增限制逻辑：

- 管理员账号不受此限制；
- 普通用户若未发生过充值流水（`TokenLedgerType.RECHARGE`）且已达到上限，则拒绝创建并提示充值解锁。

相关文件：

- `app/api/workspace/route.ts`
- `lib/user-entitlements.ts`

### 3) 下载完整包需先充值

在下载接口增加校验：

- 若开启 `requireRechargeForDownload=true` 且用户未充值，则返回 403 与明确提示；
- 管理员账号放行。

相关文件：

- `app/api/workspace/[id]/download/route.ts`
- `lib/user-entitlements.ts`

### 4) 工作空间页交互优化

用户端新增：

- 下载动作改为 `fetch + blob`，可读取服务端报错并提示；
- 下载失败时显示错误信息，并提供「前往充值」入口；
- 右侧新增「一对一辅导」卡片（可展示二维码）；
- 通过工作空间详情接口返回 `platformPolicy`（仅用于前端展示策略文案）。

相关文件：

- `app/(dashboard)/workspace/[id]/page.tsx`
- `app/api/workspace/[id]/route.ts`

## 新增环境变量

- `FREE_USER_WORKSPACE_LIMIT`
- `REQUIRE_RECHARGE_FOR_DOWNLOAD`
- `SUPPORT_CONTACT_ENABLED`
- `SUPPORT_CONTACT_TITLE`
- `SUPPORT_CONTACT_DESCRIPTION`
- `SUPPORT_CONTACT_QR_URL`

## 验收点

1. 管理后台可保存上述新增配置。
2. 未充值用户超过免费工作空间上限时，创建失败且提示明确。
3. 未充值用户点击下载时，前端可看到明确错误并可跳转充值页。
4. 已充值用户可正常下载压缩包。
5. 开启辅导卡片后，工作空间右侧显示标题、描述和二维码。

