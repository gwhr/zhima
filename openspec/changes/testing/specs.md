# 测试体系 - 功能规格

## 单元测试

- API 路由测试（auth/register、workspace CRUD）
- 工具函数测试（cn、随机昵称、验证码生成等）
- AI router 测试（不同额度阶段选择模型的逻辑）

## 集成测试

- 完整用户流程：注册 → 登录 → 创建工作空间 → 触发生成

## 测试框架

- Vitest（快速、兼容 Vite 生态）

## 测试数据库

- Docker 测试容器（隔离的 PostgreSQL 实例）
- 每次测试前重置数据
