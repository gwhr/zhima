# 测试体系 - 技术设计

## 测试框架

- Vitest: 单元测试 + 集成测试
- @testing-library/react: React 组件测试

## 目录结构

```
tests/
  ├── unit/
  │   ├── api/           # API 路由测试
  │   ├── lib/           # 工具函数、AI router 测试
  └── integration/
      └── user-flow.test.ts  # 完整用户流程

e2e/
  └── smoke.spec.ts      # Playwright 冒烟用例
```

## 测试数据库

- 单元/集成测试使用 mock，不依赖数据库容器
- e2e 保留真实服务启动能力（playwright webServer）

## Mock 策略

- AI API: mock 返回固定响应
- 认证: mock `requireAuth`
- 数据库: mock `db` 客户端方法
- 存储: mock 文件存储能力

## CI 配置

- GitHub Actions
- 触发: push / PR 到 main
- 步骤: 安装依赖 → 运行 Vitest
