# 新会话交接文档（最近更新：2026-04-29）
> 用途：换电脑或开启新会话时，先读这份文档，再开始本地环境配置和后续开发。  
> 仓库：`gwhr/zhima`  
> 默认分支：`main`  
> 当前线上已验证版本：`2cc0869 fix: refocus workspace detail layout`（2026-04-29 已部署到生产）  
> 新电脑原则：直接拉取 `origin/main` 最新 HEAD，不要以旧会话里的历史提交号为准。

## 0. 这次最近完成了什么

1. 工作空间页面继续收口：
   - `需求文档` 已提升为工作空间标题下的第一块主内容。
   - `Token 用量`、`一对一辅导`、`统计` 已从工作空间主页面移出，不再喧宾夺主。
   - 页面主线现在是：`需求文档 -> 功能确认 -> 生成与交付 -> AI 对话`。
2. `运行预览` 仍然保持下线状态，当前产品真相是：
   - 需求确认
   - 生成项目代码（主收费触发点）
   - 源码浏览 / 下载
   - 生成论文
   - 查看精选案例（独立页）
3. 生产环境已同步并验证：
   - 服务器目录：`/opt/zhima`
   - 生产 `app/worker` 已重建
   - [https://www.cloudzhima.com](https://www.cloudzhima.com) 于 2026-04-29 返回 `200 OK`
4. 最新活跃 OpenSpec 变更仍是：
   - `openspec/changes/2026-04-22-workspace-delivery-and-showcase`

## 1. 新会话 / 新电脑先读哪些文档

按这个顺序读：

1. `openspec/ROADMAP.md`
2. `openspec/ROADMAP.addendum-2026-03-25.md`
3. `openspec/ROADMAP.addendum-2026-04-15.md`
4. `docs/config-consistency-regression-baseline.md`
5. `openspec/changes/2026-04-22-workspace-delivery-and-showcase/README.md`
6. `openspec/changes/2026-04-22-workspace-delivery-and-showcase/workspace-delivery-and-showcase/proposal.md`
7. `openspec/changes/2026-04-22-workspace-delivery-and-showcase/workspace-delivery-and-showcase/specs.md`
8. `openspec/changes/2026-04-22-workspace-delivery-and-showcase/workspace-delivery-and-showcase/tasks.md`
9. `README.md`

最近归档的 OpenSpec 重点看：

- `openspec/changes/archive/2026-03-29-token-points-billing`
- `openspec/changes/archive/2026-03-31-workspace-flow-and-runtime-preview`
- `openspec/changes/archive/2026-04-02-auth-workspace-billing-stability`
- `openspec/changes/archive/2026-04-02-free-tier-funnel-and-support-contact`
- `openspec/changes/archive/2026-04-02-token-plan-publish-config`
- `openspec/changes/archive/2026-04-07-source-preview-scope-and-key-pages`
- `openspec/changes/archive/2026-04-14-thesis-online-preview-partial`
- `openspec/changes/archive/2026-04-15-user-feedback-feature`
- `openspec/changes/archive/2026-04-15-config-consistency-regression-baseline`

## 2. 当前产品真实状态（很重要）

1. 创建工作空间的向导流程没有推翻：
   - 题目 / 功能点输入
   - AI 整理需求
   - 用户确认需求
   - 创建工作空间
2. 进入工作空间后，不再承诺“在线运行用户项目”。
3. `生成项目代码` 是主收费触发点；源码浏览和下载属于生成后的交付能力，不再额外卡一次“预览收费口”。
4. `精选案例` 是平台案例页，不是当前用户项目的在线运行结果。
5. 工作空间主页面的内容优先级必须保持：
   - 需求文档优先
   - 功能确认次之
   - 生成与交付
   - AI 对话
   - 阶段/概览只做辅助
6. 如果未来有人又想把 `Token/客服/support/统计` 塞回工作空间首页，要先和当前 OpenSpec 对齐，不要直接回退页面心智。

## 3. 新电脑本地环境配置（直接照做）

### 3.1 前置安装

1. Node.js：建议 `20.x`
2. pnpm：建议 `9.x` 或当前项目锁文件兼容版本
3. Docker Desktop
4. Git

### 3.2 拉代码

```bash
git clone https://github.com/gwhr/zhima.git
cd zhima
git checkout main
git pull origin main
```

### 3.3 安装依赖

```bash
pnpm install
```

### 3.4 启动本地 Docker 依赖

```bash
docker compose up -d postgres redis
```

本地开发默认容器：

- PostgreSQL：`localhost:5433`
- Redis：`localhost:6379`

本地开发数据库默认账号（来自 `docker-compose.yml`，可以直接用）：

- Host：`localhost`
- Port：`5433`
- Database：`zhima`
- Username：`zhima`
- Password：`zhima_dev`

本地 Redis 默认：

- URL：`redis://localhost:6379`
- 无密码

### 3.5 复制环境变量模板

Windows PowerShell：

```powershell
Copy-Item .env.example .env.local
```

macOS / Linux：

```bash
cp .env.example .env.local
```

### 3.6 `.env.local` 里最少要确认的值

这些值在新电脑上要至少检查一遍：

```env
DATABASE_URL=postgresql://zhima:zhima_dev@localhost:5433/zhima
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=请换成你自己的随机值
ZHIPU_API_KEY=填你可用的智谱 Key
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

本地内置管理员默认值（仅开发环境使用）：

```env
BUILTIN_ADMIN_PHONE=15811410745
BUILTIN_ADMIN_PASSWORD=15811410745
BUILTIN_ADMIN_NAME=系统管理员
```

### 3.7 初始化数据库

```bash
pnpm db:push
```

### 3.8 启动 Web 和 Worker

需要两个终端同时启动：

```bash
pnpm dev
```

```bash
pnpm worker:dev
```

### 3.9 本地启动后的最小检查

1. 打开 `http://localhost:3000`
2. 确认注册 / 登录可用
3. 确认工作空间列表页可打开
4. 新建一个工作空间
5. 进入工作空间后确认：
   - `需求文档` 在最上面
   - `功能确认`、`生成与交付` 在其后
   - 没有把 `Token/客服/统计` 当主卡片展示

## 4. 哪些凭据可以写，哪些不能写

### 可以直接写在仓库文档里的

1. 本地 Docker 开发库默认账号：`zhima / zhima_dev`
2. 本地 Redis 地址：`redis://localhost:6379`
3. 本地内置管理员默认值：`15811410745 / 15811410745`
4. 各种环境变量字段名和用途

### 不要写进仓库文档 / 不要推到远端的

1. 生产服务器 root 密码
2. 生产数据库真实密码
3. `.env.production` 真值
4. AI、支付、短信、OSS 的生产密钥

这些敏感值新电脑需要时：

- 从旧电脑安全拷贝 `.env.local` / `.env.production` 备份
- 或通过安全渠道单独传递
- 不要把生产密钥写进 Git 历史

## 5. 生产环境真实情况（2026-04-29 核验）

1. 目标机器：`47.238.84.115`
2. 项目目录：`/opt/zhima`
3. 当前公网 `80/443` 由宿主机 `nginx` 持有，不是 `docker-compose.prod.yml` 里的 `nginx` 容器
4. 当前真实发布链路：

```bash
cd /opt/zhima
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml build app worker
docker compose -f docker-compose.prod.yml up -d --force-recreate app worker
curl -I https://www.cloudzhima.com
```

5. 发布时不要默认启动 compose 里的 `nginx`，否则会和宿主机 `nginx` 抢 `80/443`
6. 当前生产库还没有建立 Prisma migration baseline
7. 如果本次变更不涉及 `prisma/schema.prisma`，不要机械执行：

```bash
npx prisma migrate deploy
```

## 6. 继续开发时必须遵守的 OpenSpec 规则

每次改动按这个顺序：

1. 先补 OpenSpec
2. 再改代码
3. 自测通过
4. 同步 handover / regression baseline
5. 最后提交或归档

尤其是下面这些改动，必须同步更新 `docs/config-consistency-regression-baseline.md`：

- 工作空间主流程
- 收费触发点
- 源码浏览 / 下载
- 精选案例定位
- 生产部署步骤
- Docker / 数据库 / Redis 启动方式

## 7. 当前建议优先关注的后续工作

1. 继续细化工作空间右侧轻侧栏和需求文档分组，而不是把运营信息塞回主页面
2. 开始补真实 `精选案例` 内容，而不是恢复 runtime preview
3. 单独梳理生产环境 Prisma migration baseline
4. 把宿主机 `nginx` 与 compose `nginx` 的长期拓扑收口方案定下来

## 8. 可以直接复制给新会话的首条提示词

```text
请先阅读 openspec/ROADMAP.md、openspec/ROADMAP.addendum-2026-03-25.md、openspec/ROADMAP.addendum-2026-04-15.md、docs/config-consistency-regression-baseline.md，以及当前进行中的 openspec/changes/2026-04-22-workspace-delivery-and-showcase。然后按 docs/HANDOVER-NEW-SESSION-2026-04-15.md 的“新电脑本地环境配置”完成本地启动：pnpm install、docker compose up -d postgres redis、复制 .env.example 到 .env.local、pnpm db:push、pnpm dev、pnpm worker:dev。完成后先汇报当前可用状态，再继续开发。注意当前产品不再承诺在线运行用户项目，工作空间页面必须保持“需求文档优先”的信息层级。
```
