# 智码 ZhiMa - 开发路线图

> 最后更新: 2026-04-15

## 项目简介

智码是一个 AI 驱动的毕业设计辅助工具，帮助计算机专业学生自动生成毕设选题、项目代码和毕业论文。

## 阅读提示

- 本文件保留了 2026-03-19 的基线路线图与基础模块清单。
- 2026-03-25 之后的交付请同时阅读：
  - `openspec/ROADMAP.addendum-2026-03-25.md`
  - `openspec/ROADMAP.addendum-2026-04-15.md`
- 如果你是新会话接手项目，优先以 addendum 和近期待归档为准，再回看本文件的基线能力。

## 近期增量交付（2026-03-29 至 2026-04-15）

| # | 模块 | Change / 文档 | 状态 | 说明 |
|---|------|-------------|------|------|
| 37 | Token 点数计费闭环 | `archive/2026-03-29-token-points-billing` | ✅ | 钱包、冻结、结算、回退、充值流水 |
| 38 | 用户反馈系统 | `archive/2026-04-15-user-feedback-feature` | ✅ | 用户图文反馈 + 管理端分页检索/处理 |
| 39 | 运行预览排队/限时会话 | `archive/2026-03-31-workspace-flow-and-runtime-preview` | ✅ | FIFO 排队、免费次数、会话倒计时 |
| 40 | Auth / Workspace / Billing 稳定性 | `archive/2026-04-02-auth-workspace-billing-stability` | ✅ | 导航回首页、工作空间容错、账单容错、邮箱验证码 |
| 41 | 免费体验与下载卡点 | `archive/2026-04-02-free-tier-funnel-and-support-contact` | ✅ | 免费工作空间上限、下载充值判断、支持入口 |
| 42 | 充值套餐发布配置 | `archive/2026-04-02-token-plan-publish-config` | ✅ | 套餐编辑/发布、支付 create/notify 按运行时配置结算 |
| 43 | 源码范围预览与关键页 | `archive/2026-04-07-source-preview-scope-and-key-pages` | ✅ | `core/full` 预览范围 + key-page runtime preview |
| 44 | 论文在线预览收口 | `archive/2026-04-14-thesis-online-preview-partial` | ✅ | 普通用户在线只看部分论文正文 |

## 状态校正（2026-04-15）

- 支付回调后订单状态与余额未及时变化：已修复，不再作为主线待办。
- 工作空间创建失败 / 接口 500 稳定性：已补 fail-soft 与 schema-not-ready 兜底。
- 用户反馈提交与分页列表一致性：已实现并补回 OpenSpec 归档。
- 生产与本地配置一致性（支付、短信、OSS、模型）：环境变量模板已同步，平台默认配置已统一。
- 配置一致性与运行回归基线：统一维护在 `docs/config-consistency-regression-baseline.md`，后续相关改动必须同步更新。

---

## 已完成模块 ✅

### 基础设施

| # | 模块 | Change 目录 | 状态 | 说明 |
|---|------|-------------|------|------|
| 1 | 项目初始化 | `archive/2026-03-19-core-stable/project-init` | ✅ | Next.js 16 + pnpm + Docker Compose |
| 2 | 邮箱注册登录 | `archive/2026-03-19-core-stable/user-system` | ✅ | NextAuth.js v4 + bcrypt |
| 3 | 手机号注册登录 | `archive/2026-03-19-roadmap-done/phone-auth` | ✅ | 短信验证码 + 双登录方式 |
| 4 | 工作空间管理 | `archive/2026-03-19-core-stable/workspace-management` | ✅ | CRUD + 多步骤创建向导 |
| 5 | AI 模型调度 | `archive/2026-03-19-roadmap-done/ai-dispatcher` | ✅ | 多模型路由（Claude/DeepSeek/GLM）|
| 6 | Prompt 工程 | `archive/2026-03-19-roadmap-done/prompt-engineering` | ✅ | 题目推荐 + 需求拆解 prompts |
| 7 | AI 对话系统 | `archive/2026-03-19-core-stable/chat-system` | ✅ | 流式 SSE 对话 |
| 8 | 计费系统 | `archive/2026-03-19-roadmap-done/billing-system` | ✅ | 套餐定义 + 配额管理 |
| 9 | 支付系统 | `archive/2026-03-19-roadmap-done/payment-system` | ✅ | 虎皮椒集成 + Webhook |

### 核心功能

| # | 模块 | Change 目录 | 状态 | 说明 |
|---|------|-------------|------|------|
| 10 | 代码生成 | `archive/2026-03-19-roadmap-done/worker-logic` | ✅ | BullMQ Worker + AI 代码生成 |
| 11 | 论文生成 | `archive/2026-03-19-roadmap-done/thesis-generator` | ✅ | 9章节论文(含参考文献+致谢) + 封面目录 + 图表嵌入 + 表格嵌入 + DOCX 导出 |
| 12 | 图表渲染 | `archive/2026-03-19-roadmap-done/chart-renderer` | ✅ | 需求数据 → Mermaid → Kroki SVG → Sharp PNG → 嵌入论文 |
| 13 | 文件管理 | `archive/2026-03-19-roadmap-done/file-management` | ✅ | 本地存储模拟 (.storage/) |
| 14 | 文件预览 | `archive/2026-03-19-roadmap-done/code-preview` | ✅ | 代码/论文文件浏览 + 语言识别 + 复制 |
| 15 | 运行预览 | `archive/2026-03-19-roadmap-done/preview-build` | ✅ | 基于需求自动构建前端页面 + iframe 沙盒渲染 + 示例数据 |
| 16 | AI 代码修改 | `archive/2026-03-19-roadmap-done/ai-code-modify` | ✅ | 对话指令修改代码 + 一键应用 + 模糊文件匹配 + 新建文件 |

### 前端体验

| # | 模块 | Change 目录 | 状态 | 说明 |
|---|------|-------------|------|------|
| 17 | 营销首页 | `archive/2026-03-19-roadmap-done/ui-polish` | ✅ | Hero + 功能 + 定价 + FAQ |
| 18 | 登录/注册 | `archive/2026-03-19-roadmap-done/ui-polish` | ✅ | 双栏布局 + 邮箱/手机号切换 |
| 19 | Dashboard | `archive/2026-03-19-roadmap-done/ui-polish` | ✅ | 统计卡片 + 快捷入口 |
| 20 | 工作空间详情 | `archive/2026-03-19-roadmap-done/ui-polish` | ✅ | 项目概览(角色/模块/表) + 步骤引导操作 + 下载卡片 + 本地运行指南 |
| 21 | 创建项目向导 | `archive/2026-03-19-roadmap-done/ui-polish` | ✅ | 5步流程(关键词→选题→技术栈→需求→确认) + AI loading 提示 |
| 22 | 项目预览弹窗 | `archive/2026-03-19-roadmap-done/ui-polish` | ✅ | 双Tab(运行预览+文件浏览) + 全屏展示 + 示例数据说明 |
| 23 | AI 对话面板 | `archive/2026-03-19-roadmap-done/ui-polish` | ✅ | 流式对话 + Markdown 渲染 + 代码块高亮 + 一键应用修改 |
| 24 | 通知系统 | `archive/2026-03-19-roadmap-done/notification-frontend` | ✅ | 铃铛 + 面板 + 已读标记 |
| 25 | 管理后台 | `archive/2026-03-19-roadmap-done/admin-frontend` | ✅ | 数据看板 + 用户管理 + 订单管理 |
| 26 | 错误页面 | `archive/2026-03-19-roadmap-done/ui-polish` | ✅ | 403/404/500 自定义页面 |

### 部署相关

| # | 模块 | Change 目录 | 状态 | 说明 |
|---|------|-------------|------|------|
| 27 | Docker 镜像 | `archive/2026-03-19-roadmap-done/deployment` | ✅ | Dockerfile + Dockerfile.worker |
| 28 | 生产 Compose | `archive/2026-03-19-roadmap-done/deployment` | ✅ | docker-compose.prod.yml + Nginx |
| 29 | 邀请码系统 | `archive/2026-03-19-roadmap-done/referral-system` | ✅ | 生成/使用/奖励 |
| 30 | OSS 集成（阶段一） | `archive/2026-03-19-oss-complete/oss-integration` | ✅ | ZIP 打包下载 + 论文模板上传（本地存储模式） |

### 后期模块骨架（已归档）

| # | 模块 | Change 目录 | 状态 |
|---|------|-------------|------|
| 30 | 测试体系 | `archive/2026-03-19-skeleton-complete/testing` | ✅ |
| 31 | 容器管理 | `archive/2026-03-19-skeleton-complete/container-management` | ✅ 骨架 |
| 32 | SEO 落地页 | `archive/2026-03-19-skeleton-complete/seo-landing-pages` | ✅ 骨架 |
| 33 | 推广内容 | `archive/2026-03-19-skeleton-complete/promo-content-gen` | ✅ 骨架 |
| 34 | 推广数据 | `archive/2026-03-19-skeleton-complete/promo-dashboard` | ✅ 骨架 |
| 35 | 多平台发布 | `archive/2026-03-19-skeleton-complete/multi-platform-publish` | ✅ 骨架 |
| 36 | 视频制作 | `archive/2026-03-19-skeleton-complete/video-production` | ✅ 骨架 |

---

## 当前待办

### P0 - 生产准备与回归

| 任务 | 所属模块 | 说明 |
|------|----------|------|
| 真实 OSS 接入 | `archive/2026-03-19-oss-complete/oss-integration` | 用阿里云 OSS 替换生产环境本地存储模式 |
| 部署后回归基线固化 | `docs/` + `openspec/` | 每次部署后优先验证工作空间创建、充值回调、反馈列表/提交、管理端用户/流水/模型页 |

### P1 - 运维文档与上线项

| 任务 | 所属模块 | 说明 |
|------|----------|------|
| 数据库备份脚本 | `archive/2026-03-19-roadmap-done/deployment` | `scripts/backup.sh` |
| 部署文档 | `archive/2026-03-19-roadmap-done/deployment` | `docs/deployment.md` |
| 域名 + HTTPS | `archive/2026-03-19-roadmap-done/deployment` | Nginx SSL 配置 |

---

## 技术栈

| 层面 | 技术 |
|------|------|
| 前端 | Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui |
| 后端 | Next.js API Routes + Prisma 6 + PostgreSQL 16 |
| AI | Vercel AI SDK 6 + 智谱 GLM-4-Flash（可切换 Claude/DeepSeek）|
| 队列 | BullMQ + Redis 7 |
| 认证 | NextAuth.js v4（邮箱密码 + 手机验证码）|
| 支付 | 虎皮椒 |
| 部署 | Docker + Docker Compose + Nginx |
| 包管理 | pnpm |

---

## 文件统计

> 注：以下统计主要代表 2026-03-19 基线数据；03-29 之后新增的钱包、反馈、管理端、预览和配置能力未全部回写到这里，实际情况请以代码库与 addendum 为准。

- 应用页面: 13
- API 路由: 32
- 业务组件: 8（预览弹窗、AI 对话、消息渲染、创建向导等）
- UI 基础组件: 15（shadcn/ui）
- 工具库: 30
- Worker: 1
- 总代码文件: ~105
- 数据库模型: 10

---

## 关键修复记录

| 日期 | 问题 | 修复 |
|------|------|------|
| 03-19 | 代码生成路径不稳定，易出现 `generated_xxx` 无目录文件 | Worker 增加规范提示词 + 结果后处理（路径清洗、命名规整、README 兜底、最少文件校验） |
| 03-16 | Worker 不消费任务 | API 路由缺少 `taskQueue.add()` 调用，新建 `lib/queue.ts` |
| 03-16 | Worker 读不到新 API Key | Worker 用 `dotenv/config` 只读 `.env`，改为先加载 `.env.local` |
| 03-16 | 智谱 API 返回 404 | AI SDK v6 默认走 `/responses`，改用 `.chat()` 方法走 `/chat/completions` |
| 03-16 | Dialog 点空白关闭 | `DialogContent` 添加 `onPointerDownOutside` + `onInteractOutside` preventDefault |
| 03-16 | Select 被 Dialog 遮挡 | SelectContent z-index 提升到 `z-[200]`，position 改为 `popper` |
| 03-16 | AI Chat 流式响应报错 | AI SDK v6 改 `toTextStreamResponse()`，前端去掉 SSE JSON 解析 |
| 03-16 | 一键应用匹配不到文件 | 增强模糊匹配：basename/类名/组件名多级匹配 + 支持新建文件 |
| 03-16 | Worker 被 tsx --watch 中断 | `--watch-path=worker --watch-path=lib` 限定监视范围，避免 .storage 写入触发重启 |
| 03-16 | 预览弹窗不显示图表文件 | `code-preview-dialog.tsx` 增加 `CHART` 类型分组，文件浏览侧栏新增"图表"分类 |

---

## 全流程测试记录

> 2026-03-16 全流程测试通过

| 步骤 | 功能 | 结果 |
|------|------|------|
| 1 | 生成代码（BullMQ Worker） | ✅ 11 个文件生成成功 |
| 2 | 生成论文（含图表+表格自动嵌入） | ✅ DOCX 79.5KB，含封面/目录/9章/3图(ER/架构/用例)/4表/参考文献/致谢 |
| 3 | 运行预览（iframe + Mock 数据） | ✅ 仪表盘/菜单/角色/统计/操作记录正常展示 |
| 4 | 文件浏览（源代码/论文/图表） | ✅ 16 个文件三分类展示，代码高亮+复制 |
| 5 | AI 对话修改代码 | ✅ 流式响应 + 代码块渲染 + 匹配文件 + 应用修改/新建文件 |
| 6 | 下载功能 | ✅ 三类文件分别打包下载 |

> **流程简化（03-16）**: 移除独立"生成图表"步骤，图表在论文生成时自动完成。UI 从 4 步简化为 3 步：生成代码 → 生成论文（含图表） → 预览 & 下载。

