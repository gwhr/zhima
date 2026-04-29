# 配置一致性与运行回归基线

状态：活文档。只要改动了环境变量、启动链路、工作空间主流程、计费触发点、下载交付、精选案例或生产部署步骤，就必须同步更新本文档。  
最后校对：2026-04-29

## 1. 用途

这份文档解决两件事：

1. 新电脑接手时，快速知道本地开发环境该怎么配。
2. 每次改动后，知道至少要回归哪些关键链路，避免代码变了但文档和部署认知没跟上。

## 2. 什么情况下必须更新本文档

出现以下任一情况，就必须在同一轮改动里同步更新本文档：

1. 新增、删除、重命名环境变量
2. 修改 `.env.example`、`.env.production.example`、`docker-compose.yml`、`docker-compose.prod.yml`
3. 修改工作空间主流程、收费触发点、源码浏览/下载、精选案例定位
4. 修改 Redis / PostgreSQL / Worker 启动方式
5. 修改生产部署拓扑、Nginx 入口归属或数据库迁移策略
6. 修改新会话 / 新电脑默认交接路径

## 3. 当前 Source of Truth

| 领域 | 主来源 | 说明 |
|---|---|---|
| 本地 Docker 依赖 | `docker-compose.yml` | 本地 PostgreSQL / Redis 默认启动方式 |
| 本地与生产环境变量模板 | `.env.example` / `.env.production.example` | 环境字段和默认说明 |
| 平台默认配置 | `lib/system-config.ts` | 平台级开关、文案、默认行为 |
| 当前主流程定义 | `openspec/changes/2026-04-22-workspace-delivery-and-showcase/` | 工作空间、收费口、精选案例定位 |
| 新电脑接手入口 | `docs/HANDOVER-NEW-SESSION-2026-04-15.md` | 新电脑本地配置和接手顺序 |
| 生产部署真实链路 | `docs/HANDOVER-NEW-SESSION-2026-04-15.md` + `docs/server-hardening-runbook-2026-03-30.md` | 当前真实线上目录、入口和部署命令 |

## 4. 新电脑本地环境基线

### 4.1 启动步骤

```bash
pnpm install
docker compose up -d postgres redis
pnpm db:push
pnpm dev
pnpm worker:dev
```

### 4.2 本地 PostgreSQL 默认值

来自 `docker-compose.yml`：

- Host：`localhost`
- Port：`5433`
- Database：`zhima`
- Username：`zhima`
- Password：`zhima_dev`

对应 `DATABASE_URL`：

```env
DATABASE_URL=postgresql://zhima:zhima_dev@localhost:5433/zhima
```

### 4.3 本地 Redis 默认值

- URL：`redis://localhost:6379`
- 默认无密码

对应：

```env
REDIS_URL=redis://localhost:6379
```

### 4.4 新电脑上必须补的环境项

这些值不能留空：

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=http://localhost:3000`
- `ZHIPU_API_KEY`
- `DATABASE_URL`
- `REDIS_URL`

这些敏感真值不要写入仓库文档：

- 生产服务器密码
- `.env.production` 真值
- AI / 支付 / 短信 / OSS 生产密钥

## 5. 当前产品主流程基线

### 5.1 创建工作空间前

保持 requirement-first：

1. 输入题目 / 功能点
2. AI 整理需求
3. 用户确认需求
4. 创建工作空间

### 5.2 进入工作空间后

页面信息层级必须保持：

1. `需求文档` 是工作空间标题下的第一块主内容
2. `功能确认` 在其后
3. `生成与交付` 在其后
4. `AI 对话` 作为生成后的协作区域
5. `当前阶段 / 工作台概览` 只能做轻量辅助侧栏

以下内容不应再占据工作空间主页面的核心位置：

- Token 用量
- 一对一辅导 / 客服二维码
- 泛统计信息

这些内容如果要展示，应放到各自独立页面或二级入口，而不是打断需求到交付的主叙事。

### 5.3 当前收费与交付口径

1. `生成项目代码` 是主收费触发点
2. 源码浏览、源码下载属于生成后的交付能力
3. 不再承诺在线运行用户项目
4. `精选案例` 是平台案例页，不是当前用户项目运行结果

## 6. 生产环境基线（2026-04-29 核验）

1. 目标机器：`47.238.84.115`
2. 仓库目录：`/opt/zhima`
3. 当前公网 `80/443` 由宿主机 `nginx` 持有
4. `docker-compose.prod.yml` 当前真实使用的是 `app` / `worker`
5. compose 里的 `nginx` 不是默认公网入口，直接启动会与宿主机 `nginx` 争抢端口
6. 当前生产数据库未建立 Prisma migration baseline

### 6.1 当前真实发布步骤

```bash
cd /opt/zhima
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml build app worker
docker compose -f docker-compose.prod.yml up -d --force-recreate app worker
curl -I https://www.cloudzhima.com
```

### 6.2 生产发布注意事项

1. 不涉及 `prisma/schema.prisma` 时，不要默认执行 `npx prisma migrate deploy`
2. 涉及 schema 变更时，要先单独确认 migration baseline 方案
3. 不要默认 `up -d nginx`，除非先处理宿主机 `nginx` 入口归属

## 7. 最小回归清单

### 7.1 本地开发回归

1. `http://localhost:3000` 可访问
2. 注册 / 登录可用
3. 创建工作空间可用
4. 工作空间页面结构正确：
   - `需求文档` 在最前
   - 没有把 `Token/客服/统计` 作为主卡片展示
5. `pnpm worker:dev` 启动后，代码生成任务可入队并有状态变化

### 7.2 业务链路回归

1. 工作空间：创建、列表、详情正常
2. 功能确认：确认 / 调整需求正常
3. 计费：余额不足时，代码生成能正确提示充值
4. 交付：源码浏览、源码下载、论文生成入口正常
5. 精选案例：页面可访问，且明确标识为平台案例
6. 用户反馈：提交、列表、管理端分页正常

### 7.3 生产发布后回归

1. `git rev-parse --short HEAD` 与目标发布版本一致
2. `docker compose -f docker-compose.prod.yml ps` 中 `app` / `worker` 为 `Up`
3. `curl -I https://www.cloudzhima.com` 返回 `200` 或预期跳转
4. 如果改了工作空间页面，线上打开后确认 `需求文档优先` 的版式仍然成立

## 8. 维护约束

1. 只要改了工作空间主流程，就必须同步更新 OpenSpec + handover + 本文档
2. 只要改了 Docker / DB / Redis / Worker 启动方式，就必须同步更新 handover 和本文档
3. 只要改了生产部署方式，就必须同步更新 handover、本文档和相关 runbook
4. 不要把生产密码、服务器 root 密码、`.env.production` 真值写进仓库文档或提交到远端
