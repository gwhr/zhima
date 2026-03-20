# 测试体系 - 任务列表

## 实现任务

- [x] T1: 安装 Vitest + testing-library
- [x] T2: 配置测试环境（mock 驱动，避免依赖外部服务）
- [x] T3: 编写 API 路由单元测试（auth/register、workspace）
- [x] T4: 编写 AI router 单元测试（不同额度阶段选模型）
- [x] T5: 编写工具函数测试（随机昵称）
- [x] T6: 编写集成测试（注册 → 创建工作空间 → 查询列表）
- [x] T7: 配置 CI 流水线（GitHub Actions）

## 自测记录

- 2026-03-19: `npx pnpm test:run` 通过，5 个测试文件，16 个用例全部通过
- 2026-03-19: `npx playwright test --list` 可发现 e2e 用例（`e2e/smoke.spec.ts`）
