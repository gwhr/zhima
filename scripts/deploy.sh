#!/bin/bash
set -e

echo "=== 智码 ZhiMa 部署脚本 ==="

if [ ! -f .env.production ]; then
  echo "错误: 缺少 .env.production 文件"
  echo "请复制 .env.production.example 并填写配置"
  exit 1
fi

echo "1. 拉取最新代码..."
git pull origin main

echo "2. 构建 Docker 镜像..."
docker compose -f docker-compose.prod.yml build

echo "3. 停止旧容器..."
docker compose -f docker-compose.prod.yml down

echo "4. 启动新容器..."
docker compose -f docker-compose.prod.yml up -d

echo "5. 等待数据库就绪..."
sleep 10

echo "6. 执行数据库迁移..."
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

echo "=== 部署完成 ==="
echo "访问: http://localhost (或配置的域名)"
docker compose -f docker-compose.prod.yml ps
