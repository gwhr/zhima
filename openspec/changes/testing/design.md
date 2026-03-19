# 测试体系 - 技术设计

## 测试框架

- Vitest: 单元测试 + 集成测试
- @testing-library/react: React 组件测试

## 目录结构

```
__tests__/
  ├── unit/
  │   ├── api/           # API 路由测试
  │   ├── utils/         # 工具函数测试
  │   └── ai/            # AI router 测试
  └── integration/
      └── user-flow.test.ts  # 完整用户流程
```

## 测试数据库

- 使用 Docker 启动独立 PostgreSQL 容器
- 测试前执行 `prisma migrate reset`
- 测试环境 `.env.test`

## Mock 策略

- AI API: mock 返回固定响应
- Redis: 使用 ioredis-mock 或真实 Redis 容器
- OSS: mock 文件存储

## CI 配置

- GitHub Actions
- 触发: push / PR 到 main
- 步骤: 安装依赖 → 启动测试容器 → 运行测试 → 上传覆盖率报告
