# project-init: 技术设计

## 1. 项目目录结构

```
zhima/
├── app/
│   ├── (marketing)/           # 营销页面组（无需登录）
│   │   ├── layout.tsx
│   │   └── page.tsx           # 首页
│   ├── (dashboard)/           # 登录后页面组
│   │   ├── layout.tsx         # 含侧边栏/导航
│   │   └── workspace/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── admin/                 # 管理后台
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   └── health/
│   │       └── route.ts       # 健康检查
│   ├── layout.tsx             # 根布局
│   └── globals.css
├── components/
│   └── ui/                    # shadcn/ui 组件
├── lib/
│   ├── db.ts                  # Prisma 客户端单例
│   ├── redis.ts               # Redis 客户端
│   ├── auth.ts                # NextAuth 配置
│   ├── api-response.ts        # 统一响应格式
│   └── utils.ts               # 通用工具函数
├── worker/
│   └── index.ts               # Worker 入口（占位）
├── prisma/
│   └── schema.prisma
├── docker-compose.yml         # 开发环境
├── Dockerfile                 # 生产镜像（后续）
├── .env.example
├── .env.local                 # 本地开发（gitignore）
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## 2. Docker Compose（开发环境）

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: zhima
      POSTGRES_PASSWORD: zhima_dev
      POSTGRES_DB: zhima
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
```

## 3. Prisma 客户端单例

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

## 4. 统一 API 响应格式

```typescript
// lib/api-response.ts
export function success<T>(data: T) {
  return Response.json({ success: true, data })
}

export function error(message: string, status = 400) {
  return Response.json({ success: false, error: message }, { status })
}
```

## 5. 健康检查接口

```
GET /api/health → { status: "ok", db: "connected", redis: "connected" }
```

## 6. 关键决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 主键类型 | UUID (cuid2) | 全局唯一，未来跨产品不冲突 |
| 密码加密 | bcrypt (12 rounds) | 行业标准 |
| 时间存储 | UTC DateTime | 避免时区问题 |
| 金额存储 | Decimal (分) | 避免浮点精度问题 |
| JSON 字段 | Prisma Json 类型 | 技术栈配置/需求清单等灵活结构 |
