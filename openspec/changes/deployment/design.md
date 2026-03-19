# 生产部署 - 技术设计

## Dockerfile 多阶段构建

```
Stage 1: deps      → 安装依赖
Stage 2: builder   → 构建应用 (next build)
Stage 3: runner    → 运行 standalone 产物
```

- 基础镜像: `node:20-alpine`
- 最终镜像大小: ~200MB

## docker-compose.prod.yml 结构

```yaml
services:
  app:        # Next.js 应用 + Worker
  postgres:   # PostgreSQL 15
  redis:      # Redis 7
  nginx:      # Nginx 反向代理
```

## Nginx 配置

- 监听 80/443 端口
- SSL: certbot + Let's Encrypt
- proxy_pass 到 app:3000
- 静态资源 /_next/static 长缓存

## 部署流程

1. `git pull` 拉取最新代码
2. `docker compose build` 构建镜像
3. `docker compose run app npx prisma migrate deploy` 执行迁移
4. `docker compose up -d` 启动服务

## 备份

- PostgreSQL: pg_dump 定时备份到 OSS
- 备份脚本: `scripts/backup.sh`
