# project-init: 项目初始化与基础架构

## 目标
搭建智码（ZhiMa）平台的项目骨架，包括 Next.js 项目初始化、数据库设计、基础中间件、Docker 开发环境。这是所有后续模块的基础。

## 背景
智码是一个 AI 驱动的毕设全流程工作台，技术架构采用 Next.js 14 全栈 + Worker 异步处理。需要先把项目框架搭好，数据库表设计完成，后续模块才能在此基础上开发。

## 交付物
- 可运行的 Next.js 14 项目（App Router）
- 完整的 Prisma Schema（所有核心业务表）
- Docker Compose 开发环境（PostgreSQL + Redis）
- 基础中间件（错误处理、请求日志、CORS）
- 项目目录结构规范
- 环境变量模板 (.env.example)

## 优先级
🔴 P0 — 阻塞所有后续模块
