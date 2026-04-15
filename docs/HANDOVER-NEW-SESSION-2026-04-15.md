# 新会话交接文档（2026-04-15）

> 用途：你准备开一个新会话时，把这份文档发给新会话，让它快速接管项目并继续开发。  
> 仓库：`gwhr/zhima`  
> 分支：`main`

## 1. 新会话必须先做的事（阅读顺序）

1. 先读 [openspec/ROADMAP.md](/D:/code/plantcloud/毕设助手/openspec/ROADMAP.md)
2. 再读 [openspec/ROADMAP.addendum-2026-03-25.md](/D:/code/plantcloud/毕设助手/openspec/ROADMAP.addendum-2026-03-25.md)
3. 再读 [openspec/ROADMAP.addendum-2026-04-15.md](/D:/code/plantcloud/毕设助手/openspec/ROADMAP.addendum-2026-04-15.md)
4. 再读 [docs/config-consistency-regression-baseline.md](/D:/code/plantcloud/毕设助手/docs/config-consistency-regression-baseline.md)
5. 再读 `openspec/changes/archive/` 下最近归档：
   - `2026-03-29-token-points-billing`
   - `2026-03-31-workspace-flow-and-runtime-preview`
   - `2026-04-02-auth-workspace-billing-stability`
   - `2026-04-02-free-tier-funnel-and-support-contact`
   - `2026-04-02-token-plan-publish-config`
   - `2026-04-07-source-preview-scope-and-key-pages`
   - `2026-04-14-thesis-online-preview-partial`
   - `2026-04-15-user-feedback-feature`
   - `2026-04-15-config-consistency-regression-baseline`
6. 再读 [README.md](/D:/code/plantcloud/毕设助手/README.md)
7. 最后读 `docs/` 下近期 PRD（按日期倒序）

## 2. 项目结构速览（给新会话快速定位）

- `app/`：Next.js App Router 页面与 API 路由
- `components/`：核心业务组件（工作空间、预览、对话、后台页面组件）
- `lib/`：AI 调度、计费、支付、短信、存储、队列工具
- `worker/`：BullMQ 后台任务（代码生成、论文生成、图表等）
- `prisma/`：数据模型与迁移
- `openspec/`：需求变更、增补说明与归档基线
- `docs/`：产品文档、部署说明、交接资料

## 3. 启动与自检流程（本地）

1. 安装依赖：`pnpm install`
2. 启动依赖服务：`docker compose up -d postgres redis`
3. 同步数据库：`pnpm db:push`
4. 启动 Web：`pnpm dev`
5. 启动 Worker：`pnpm worker:dev`
6. 基本检查：
   - `http://localhost:3000` 可访问
   - 登录/注册可用
   - 创建工作空间可用
   - 代码生成任务能入队并有状态变化

## 4. 生产环境操作约定（非常重要）

1. 生产库数据不能被初始化覆盖
2. 每次部署前先确认 `.env.production` 未被重置
3. 每次部署后优先回归：
   - 工作空间创建
   - 充值下单与回调状态变更
   - 用户反馈提交与列表
   - 管理端用户/流水/模型页可正常加载
4. 部署后若出现 500，先看容器日志再改代码，不要盲目重建数据库

## 5. OpenSpec 工作规范（必须遵守）

每个功能点都按这 4 步：

1. 开发前先补 OpenSpec（proposal/specs/tasks）
2. 实现功能
3. 浏览器或接口自测通过
4. 归档到 `openspec/changes/archive/<date>-<feature>/`

补充规则：

- 只要改动影响配置说明、环境变量、启动链路或关键业务回归范围，必须同步更新 [config-consistency-regression-baseline.md](/D:/code/plantcloud/毕设助手/docs/config-consistency-regression-baseline.md)

## 6. 状态校正（以下问题已修复，不再作为首要排查项）

1. 支付回调后订单状态与余额未及时变化：
   - 已由 [token-plan-publish-config](/D:/code/plantcloud/毕设助手/openspec/changes/archive/2026-04-02-token-plan-publish-config/README.md) 与 [token-points-billing](/D:/code/plantcloud/毕设助手/openspec/changes/archive/2026-03-29-token-points-billing/README.md) 覆盖。
   - 当前回调路径为事务内更新订单并充值钱包：`/api/payment/notify`。
2. 工作空间创建失败 / 接口 500 稳定性：
   - 已由 [auth-workspace-billing-stability](/D:/code/plantcloud/毕设助手/openspec/changes/archive/2026-04-02-auth-workspace-billing-stability/README.md) 覆盖。
   - 工作空间创建、列表、详情均已加入 fail-soft/结构兜底。
3. 用户反馈提交与分页列表一致性：
   - 已补 OpenSpec 归档 [user-feedback-feature](/D:/code/plantcloud/毕设助手/openspec/changes/archive/2026-04-15-user-feedback-feature/README.md)。
   - 当前代码已具备用户提交、我的反馈分页、管理端分页检索、状态处理与图片鉴权。
4. 生产与本地配置一致性（支付、短信、OSS、模型）：
   - `.env.example` 与 `.env.production.example` 已同步支付、短信、邮箱、OSS、模型相关字段。
   - 平台默认配置与运行时归一化集中在 `lib/system-config.ts`。

## 7. 当前建议优先关注点

1. 先做一轮本地启动与回归，确认当前仓库在你接手时的真实可用状态。
2. 生产相关仍应重点关注真实 OSS 接入、部署文档、备份脚本与 HTTPS。
3. 若后续继续改业务功能，以上 4 项应按“回归检查项”对待，而不是重新当作待修主线。

## 8. 可直接复制给“新会话”的首条提示词

```text
请先完整阅读 openspec/ROADMAP.md、openspec/ROADMAP.addendum-2026-03-25.md、openspec/ROADMAP.addendum-2026-04-15.md、docs/config-consistency-regression-baseline.md，以及 openspec/changes/archive 最近归档（重点 2026-03-29、2026-03-31、2026-04-02、2026-04-07、2026-04-14、2026-04-15），然后阅读 README.md 与 docs 下最近 PRD。
阅读后先做一次本地启动与自检（pnpm install、docker compose up -d postgres redis、pnpm db:push、pnpm dev、pnpm worker:dev），输出当前可用状态与阻塞点。
接着按 OpenSpec 流程继续开发：开发前补变更、开发后自测、最后归档。注意支付回调闭环、工作空间稳定性、用户反馈列表/提交、配置一致性这几项已经落地，默认作为回归项而不是待修主线。若本次改动影响配置解释、环境变量或关键链路回归范围，必须同步更新 docs/config-consistency-regression-baseline.md。
```

## 9. 交接补充

- 如果新会话遇到命令行 `node/pnpm` 识别异常，优先检查 PATH 是否被会话污染
- Windows 场景可先用绝对路径临时执行 `pnpm.cmd`，避免阻塞排查
- 若要同步线上改动回本地，先 `git fetch` + `git pull`，不要直接覆盖生产配置文件
