# 智码 ZhiMa - AI 毕设助手

AI 驱动的毕业设计辅助工具，帮助计算机专业学生自动生成选题、项目代码和毕业论文。

## 快速启动（新电脑）

### 前置要求

- **Node.js** >= 18（推荐 20+）
- **pnpm** >= 8（`npm install -g pnpm`）
- **Docker Desktop**（用于 PostgreSQL 和 Redis）
- **智谱 AI API Key**（免费注册 [open.bigmodel.cn](https://open.bigmodel.cn)）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动数据库和 Redis

```bash
docker compose up -d
```

这会启动：
- PostgreSQL 16（端口 5433 → 容器内 5432）
- Redis 7（端口 6379）

### 3. 配置环境变量

复制示例文件并填入你的配置：

```bash
cp .env.example .env.local
```

必填项：

```env
# 数据库（默认即可）
DATABASE_URL=postgresql://zhima:zhima_dev@localhost:5433/zhima

# Redis（默认即可）
REDIS_URL=redis://localhost:6379

# NextAuth
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=http://localhost:3000

# 智谱 AI（必填，去 open.bigmodel.cn 获取）
ZHIPU_API_KEY=你的API Key
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

### 4. 初始化数据库

```bash
npx prisma db push
```

### 5. 启动项目

需要**同时启动两个进程**：

```bash
# 终端 1：启动 Next.js 开发服务器
pnpm dev

# 终端 2：启动后台任务 Worker（代码生成、论文生成等）
pnpm worker:dev
```

打开 http://localhost:3000 即可访问。

---

## 项目结构

```
├── app/                        # Next.js App Router
│   ├── (auth)/                 # 登录、注册页面
│   ├── (dashboard)/            # 控制台（仪表盘、工作空间、计费、个人资料）
│   ├── (marketing)/            # 营销首页
│   ├── admin/                  # 管理后台
│   └── api/                    # 30 个 API 路由
│       ├── auth/               # 认证（注册、登录、发送验证码）
│       ├── ai/                 # AI（题目推荐、需求拆解）
│       ├── workspace/[id]/     # 工作空间（生成代码、论文、预览构建、文件管理、代码应用）
│       ├── chat/               # AI 对话（流式响应 + 项目上下文注入）
│       ├── billing/            # 计费（套餐、配额）
│       ├── payment/            # 支付（创建订单、回调）
│       └── admin/              # 管理（统计、用户、订单）
├── components/                 # 8 个业务组件 + 15 个 UI 基础组件
│   ├── ui/                     # shadcn/ui 基础组件
│   ├── layout/                 # 导航栏、侧边栏
│   ├── create-workspace-dialog.tsx  # 多步骤创建项目向导
│   ├── code-preview-dialog.tsx # 项目预览弹窗（运行预览 + 文件浏览双Tab）
│   ├── chat-panel.tsx          # AI 对话面板（流式对话）
│   ├── chat-message.tsx        # 消息渲染（Markdown + 代码高亮 + 一键应用）
│   └── notification-bell.tsx   # 通知铃铛
├── lib/                        # 30 个工具库
│   ├── ai/                     # AI 模型配置、路由、Prompt
│   ├── thesis/                 # 论文生成、DOCX 构建
│   ├── chart/                  # 图表生成（确定性 Mermaid 生成 + Kroki SVG + Sharp PNG）
│   ├── parser/                 # 代码解析器（提取文件名、代码块）
│   ├── payment/                # 支付集成
│   ├── sms/                    # 短信验证码
│   ├── parse-ai-code-blocks.ts # AI 代码块解析 + 模糊文件匹配
│   ├── queue.ts                # BullMQ 任务队列
│   ├── redis.ts                # Redis 客户端
│   ├── db.ts                   # Prisma 客户端
│   └── auth.ts                 # NextAuth 配置
├── worker/                     # BullMQ Worker（后台任务处理）
│   └── index.ts                # 代码生成、论文生成、图表渲染
├── prisma/
│   └── schema.prisma           # 数据库 Schema（10 个模型）
├── openspec/                   # 开发文档和任务跟踪
│   ├── ROADMAP.md              # 开发路线图
│   └── changes/                # 各模块详细设计文档
├── docker-compose.yml          # 开发环境（PG + Redis）
├── docker-compose.prod.yml     # 生产环境
├── Dockerfile                  # 应用镜像
└── Dockerfile.worker           # Worker 镜像
```

## NPM Scripts

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动 Next.js 开发服务器（端口 3000）|
| `pnpm worker:dev` | 启动 Worker 进程（代码/论文生成）|
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 启动生产服务器 |

## 浏览器全链路实测（Live）

该项目已内置 Playwright 全链路用例：`e2e/full-flow.live.spec.ts`  
覆盖流程：注册 → 创建工作空间 → 生成代码 → 生成论文 → 预览 → 下载。

运行前请确保：
- `pnpm dev` 可正常启动
- `pnpm worker:dev` 已启动（必须）
- `.env.local` 中 AI / DB / Redis 配置完整

PowerShell 执行：

```powershell
$env:E2E_LIVE="1"
npx pnpm exec playwright test e2e/full-flow.live.spec.ts
```

## 数据库模型

| 模型 | 说明 |
|------|------|
| User | 用户（邮箱/手机号、密码、角色）|
| Workspace | 工作空间（选题、技术栈、需求）|
| ChatMessage | AI 对话消息 |
| TaskJob | 后台任务（代码生成、论文生成）|
| WorkspaceFile | 生成的文件 |
| Order | 订单 |
| UserQuota | 用户配额 |
| AiUsageLog | AI 使用日志 |
| Notification | 通知 |
| InviteCode | 邀请码 |

## 核心流程

1. 用户注册/登录（邮箱 或 手机号）
2. 创建工作空间（AI 推荐选题 → 选技术栈 → 生成需求清单）
3. 进入工作空间后先做“功能确认闸门”：确认当前需求或输入修改想法，由 AI 重分析并先完成难度评估
4. 点击"生成代码" → BullMQ 队列 → Worker 调用 AI → 代码存入存储层（本地/OSS）
5. 点击"生成论文" → Worker 自动生成图表（ER图/架构图/用例图，Mermaid→SVG→PNG）+ AI 撰写 9 章 → 图表/表格自动嵌入 → 输出 DOCX
6. 点击"预览" → 运行预览（自动构建前端界面 + 示例数据）或文件浏览（源码/论文/图表）
7. AI 对话修改代码 → 输入指令 → AI 给出修改方案 → 一键应用到项目文件
8. 下载压缩包，按本地运行指南部署

## 常见问题

### 端口 3000 被占用
```bash
# Windows: 找到并杀掉占用进程
netstat -ano | findstr :3000
taskkill /PID <PID> /F
# 然后删除 .next 目录重启
Remove-Item -Recurse -Force .next
pnpm dev
```

### Worker 不消费任务
确保 Worker 进程已启动（`pnpm worker:dev`），并且 `.env.local` 中配置了正确的 `ZHIPU_API_KEY`。

### 智谱 API Key 过期
去 [open.bigmodel.cn](https://open.bigmodel.cn) 重新生成 Key，更新 `.env.local` 中的 `ZHIPU_API_KEY`，然后重启 Worker。

### Docker 容器没启动
```bash
docker compose up -d
docker compose ps  # 确认 postgres 和 redis 都是 Running
```
## Token Quota (Phase 1)

当前版本支持“按用户总 Token 额度”控制成本，不依赖前端模型下拉。

- 固定模型（Worker）:
  - `CODE_GEN_MODEL_ID=deepseek`
  - `THESIS_GEN_MODEL_ID=glm`
- 免费额度:
  - `DEFAULT_USER_TOKEN_BUDGET=500000`
- 任务入队预留:
  - `CODE_GEN_TOKEN_RESERVE=120000`
  - `THESIS_GEN_TOKEN_RESERVE=220000`

实现说明:

- 代码生成、论文生成、AI 对话都会记录 `AiUsageLog` 的 `inputTokens/outputTokens`。
- 系统按用户历史 `AiUsageLog` 聚合计算 `tokenUsed`，并与 `DEFAULT_USER_TOKEN_BUDGET` 比较。
- 当余额不足时，接口会返回 `402`，任务不会进入队列。
- 下载能力一期保持开放，不做下载拦截。
