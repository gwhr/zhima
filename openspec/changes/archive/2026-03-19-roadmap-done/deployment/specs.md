# 生产部署 - 功能规格

## Dockerfile

- 多阶段构建
- 基础镜像: Node 20 alpine
- Next.js standalone output 模式

## docker-compose.prod.yml

服务编排：
- 应用服务（Next.js）
- PostgreSQL
- Redis
- Nginx（反向代理）

## Nginx

- 反向代理到 Next.js 应用
- SSL 证书（Let's Encrypt）
- 静态资源缓存
- gzip 压缩

## 环境变量

- `.env.production` 模板
- 敏感信息不入库

## 数据库迁移

- 使用 `prisma migrate deploy` 执行迁移
- 部署脚本自动执行

## 日志收集

- 应用日志标准输出
- Docker 日志驱动收集
