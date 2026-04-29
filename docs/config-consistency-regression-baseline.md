# 配置一致性与运行回归基线

状态：活文档，后续每次涉及配置、启动链路、关键业务链路的改动都必须同步更新  
最后校对：2026-04-29

## 1. 用途

这份文档是项目当前“配置一致性 + 运行回归基线”的统一入口，用来解决两个问题：

1. 新会话接手时，能快速知道本地和生产环境哪些配置应该一致，哪些是预期差异。
2. 每次改动后，能快速知道至少要回归哪些关键路径，避免“代码改了、文档没跟上”。

交接新会话时，默认应把这份文档和 `docs/HANDOVER-NEW-SESSION-2026-04-15.md` 一起给过去。

## 2. 什么时候必须更新这份文档

只要出现以下任一情况，就必须在同一次改动里同步更新本文件：

1. 新增、删除、重命名环境变量。
2. 修改 `.env.example`、`.env.production.example`、`lib/system-config.ts` 中的默认值或解释。
3. 修改支付、短信、邮箱、OSS、模型、Worker 启动、Redis / PostgreSQL 连接相关逻辑。
4. 修改工作空间、代码生成收费点、源码浏览/下载、精选案例、反馈、管理端配置页等关键链路的回归预期。
5. 修改生产部署拓扑、Nginx 入口归属、部署脚本或数据库迁移策略。
6. 修改新会话交接阅读顺序或默认回归范围。

## 3. 配置源头（Source of Truth）

| 领域 | 主要源头 | 说明 |
|------|----------|------|
| 基础运行 | `.env.example` / `.env.production.example` | 本地与生产环境变量模板 |
| 平台默认配置 | `lib/system-config.ts` | 平台默认开关、额度、交付文案、支持入口、套餐配置 |
| 平台运行时配置 | `/api/admin/platform-config` + `SystemConfig(platform:settings)` | 管理端保存后实际生效的运行时平台配置 |
| 模型供应商配置 | `lib/model-provider-config.ts` | 后台保存优先，环境变量作为回退 |
| 代码/论文默认模型 | `CODE_GEN_MODEL_ID` / `THESIS_GEN_MODEL_ID` + 平台配置 | Worker 主链路默认模型选择 |
| 支付配置 | `HUPIJIAO_APPID` / `HUPIJIAO_SECRET` / `NEXTAUTH_URL` + `lib/payment/hupijiao.ts` | 支付创建、回调地址、回跳地址都依赖这里 |
| 短信配置 | `SMS_*` + `lib/sms/provider.ts` | 发送模式、限流、验证码锁定 |
| 邮箱验证码 | `EMAIL_*` / `SMTP_*` + `lib/email/provider.ts` | 发送模式、限流、SMTP 发信 |
| 存储配置 | `STORAGE_PROVIDER` / `OSS_*` + `lib/storage/oss.ts` | 本地 `.storage` 与阿里云 OSS 双模式 |
| 队列/后台任务 | `REDIS_URL` + `pnpm worker:dev` | Web 只负责入队，Worker 负责消费 |
| 充值套餐运行时读取 | `lib/billing/plans.ts` + 平台配置 | 用户侧只能看到已发布套餐，支付回调按运行时套餐结算 |
| 生产部署目录 | `/opt/zhima`（当前线上） + `docker-compose.prod.yml` | 2026-04-29 已确认当前线上仓库目录为 `/opt/zhima` |
| 公网入口 / 反代 | 宿主机 `nginx`（当前线上） + `nginx/default.conf`（仓库配置候选） | 2026-04-29 已确认当前 `80/443` 由宿主机 `nginx` 持有，不是 compose `nginx` 容器 |

## 4. 本地与生产环境预期差异

| 项目 | 本地预期 | 生产预期 | 备注 |
|------|----------|----------|------|
| `NEXTAUTH_URL` | `http://localhost:3000` | 真实 HTTPS 域名 | 支付回调/回跳地址直接依赖它 |
| `SMS_MODE` | `mock` | `real` | 本地默认不消耗真实短信 |
| `EMAIL_MODE` | `mock` | `real` | 生产启用邮箱验证码前必须配置 SMTP |
| `STORAGE_PROVIDER` | `local` | `oss` | 生产目标是 OSS；当前仓库仍需持续关注真实 OSS 回归 |
| 支付参数 | 可留空 | 上线支付前必须完整配置 | 包含 `HUPIJIAO_APPID` / `HUPIJIAO_SECRET` |
| 模型供应商 Key | 可仅配最小可运行集合 | 应完整配置或由后台覆盖 | 后台保存优先，环境变量为回退 |
| 支持二维码 | 可用占位图 | 可用占位图或正式二维码 | 前后台文案要一致 |
| Web 入口层 | 本地直接访问 `localhost:3000` | 当前生产由宿主机 `nginx` 反代到容器 `3000` | `docker-compose.prod.yml` 内 `nginx` 服务当前不在现网流量路径 |
| 数据库迁移方式 | `pnpm db:push` / 本地手工调整 | 当前生产不能直接套用 `prisma migrate deploy` | 生产库尚未建立 Prisma migration baseline，schema 变更需单独制定方案 |

## 5. 最小运行回归基线

### 5.1 每次涉及运行链路改动后至少要验证

1. `pnpm install`
2. `docker compose up -d postgres redis`
3. `pnpm db:push`
4. `pnpm dev`
5. `pnpm worker:dev`
6. `http://localhost:3000` 可访问
7. 登录/注册可用
8. 创建工作空间可用

### 5.2 每次涉及关键业务链路改动后必须补充验证

1. 工作空间：
   - 工作空间列表、详情页可打开
   - 创建工作空间不出现 500
   - 代码生成任务能入队并有状态变化
2. 充值/账单：
   - 账单页能加载余额、流水、套餐
   - 套餐发布状态与用户侧展示一致
   - 如果改了支付/回调链路，必须验证“订单状态变更 + 钱包余额/流水同步”
3. 源码浏览/下载/案例：
   - 源码浏览弹窗可打开，`core/full` 切换正常
   - 下载代码/论文/图表压缩包与页面文案一致
   - 精选案例页可正常访问，且明确标识为平台案例
4. 用户反馈：
   - 用户可提交反馈
   - “我的反馈记录”总数与分页一致
   - 管理端 `/admin/feedback` 可分页、筛选、更新状态
5. 管理端：
   - `/admin/platform`
   - `/admin/users`
   - `/admin/token-ledger`
   - `/admin/models`
   以上页面至少能正常加载

### 5.3 每次涉及生产部署链路或服务器更新后必须补充验证

1. 服务器目录仍为 `/opt/zhima`，且 `git rev-parse --short HEAD` 与目标提交一致。
2. `docker compose -f docker-compose.prod.yml ps` 中 `app`、`worker` 至少为 `Up` 状态。
3. `curl -I https://www.cloudzhima.com` 返回 `200` 或预期跳转，不出现持续 `502`。
4. `ss -ltnp '( sport = :80 or sport = :443 )'` 的结果要与预期入口一致；当前线上应看到宿主机 `nginx` 持有 `80/443`。
5. 若本次发布不涉及 Prisma schema 变更，不要强行执行 `npx prisma migrate deploy`。
6. 若本次发布涉及 Prisma schema 变更，先确认 production migration baseline，再决定是否执行 `migrate deploy`。

## 6. 配置改动时的同步规则

### 6.1 改环境变量时，至少同步这 4 处

1. `.env.example`
2. `.env.production.example`
3. 对应运行时代码
4. 本文档

### 6.2 改平台配置时，至少同步这 4 处

1. `lib/system-config.ts`
2. `/api/admin/platform-config`
3. 对应前台/后台使用页面
4. 本文档

### 6.3 改支付、短信、邮箱、OSS、模型时，至少同步这 3 类内容

1. 代码实现
2. OpenSpec / PRD / 交接说明
3. 本文档里的“配置源头 + 回归基线”

## 7. 变更类型与必做回归

| 变更类型 | 至少补做的回归 |
|------|----------|
| Auth / 注册 / 验证码 | 登录、注册、验证码发送、验证码校验 |
| Workspace / 创建向导 | 创建工作空间、列表、详情、后续跳转 |
| Payment / Billing | 账单页、套餐展示、下单、回调结算、流水 |
| Feedback | 用户提交、用户列表分页、管理端分页/筛选/处理 |
| Storage / OSS | 文件上传、下载、源码浏览、生成产物读取 |
| Model / Worker | 代码生成、论文生成、AI 对话至少一条主链路 |
| Platform config | 管理端保存配置后，用户端行为变化与配置一致 |

## 8. 新会话交接要求

新会话默认阅读顺序建议为：

1. `openspec/ROADMAP.md`
2. `openspec/ROADMAP.addendum-2026-03-25.md`
3. `openspec/ROADMAP.addendum-2026-04-15.md`
4. `docs/config-consistency-regression-baseline.md`
5. 最近归档
6. `README.md`
7. 近期 PRD

## 9. 当前基线判断（2026-04-29）

1. 支付回调闭环：已落地，默认作为回归项，不再作为待修主线。
2. 工作空间创建稳定性：已做 fail-soft 与 schema-not-ready 兜底。
3. 用户反馈提交与分页一致性：已实现，OpenSpec 已补归档。
4. 本地/生产配置模板：支付、短信、邮箱、OSS、模型已补齐到模板。
5. 当前主流程已经从“运行预览”切换为“生成代码收费 + 源码浏览/下载 + 精选案例参考”；后续相关改动必须按这条链路回归。
6. 当前生产入口实际是“宿主机 `nginx` + compose 内 `app/worker`”，不是 `docker-compose.prod.yml` 里的 `nginx` 容器。
7. 当前生产库未建立 Prisma migration baseline；部署文档里的迁移步骤不能直接照抄到所有版本发布。

## 10. 维护约束

后续如果你或新会话修改了任何会影响“配置解释”或“回归范围”的内容，必须在同一次改动里同步更新本文件；不要等到下一次交接时再补。
