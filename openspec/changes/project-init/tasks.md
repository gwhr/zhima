# project-init: 任务清单

## 任务列表

- [x] T1: 初始化 Next.js 14 项目（TypeScript, App Router, TailwindCSS）
- [x] T2: 安装核心依赖（prisma, @auth/core, bullmq, zod, ioredis, ai, @ai-sdk/anthropic, @ai-sdk/openai）
- [x] T3: 初始化 shadcn/ui（手动配置 components.json + cn 工具函数）
- [x] T4: 创建 docker-compose.yml（PostgreSQL 16 + Redis 7）
- [x] T5: 编写完整 prisma/schema.prisma（10 张表，含枚举、关联、索引）
- [x] T6: 创建 lib/db.ts（Prisma 7 适配器模式 + 客户端单例）
- [x] T7: 创建 lib/redis.ts（Redis 客户端）
- [x] T8: 创建 lib/api-response.ts（统一响应工具）
- [x] T9: 创建 lib/utils.ts（cn 函数等通用工具）
- [x] T10: 创建 .env.example（所有环境变量模板）
- [x] T11: 创建 app/api/health/route.ts（健康检查接口）
- [x] T12: 创建基础目录结构（app/components/lib/worker 骨架）
- [x] T13: 创建 worker/index.ts（BullMQ Worker 入口占位）
- [x] T14: 配置 package.json scripts（dev, build, worker:dev, db:push, db:migrate）
- [x] T15: 运行 docker compose up + prisma db push 验证全流程跑通
- [x] T16: 创建 README.md（本地开发指南）

## 验收标准
1. `pnpm dev` 启动正常，访问 localhost:3000 看到首页
2. `GET /api/health` 返回 `{ status: "ok", db: "connected", redis: "connected" }`
3. Prisma Studio（`npx prisma studio`）能看到所有表结构
4. Worker 进程能启动（即使没有任务处理）
