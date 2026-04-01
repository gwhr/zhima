# 可运行脚手架 + 对话暂停 PRD（2026-03-31）

## 背景
- 当前用户以“零代码基础”为主，预期是下载后按步骤安装依赖即可运行。
- 现状中，AI 偶发只生成局部文件，导致用户仍需手动补目录与配置。
- AI 对话是流式输出，缺少“停止生成”能力，长回复场景体验差。

## 目标
- 代码生成后自动补齐最小可运行结构（后端入口、前端入口、依赖文件、README）。
- 对话区支持中止当前流式回复，避免用户被长输出“绑住”。

## 本次范围（P0）
- `worker` 端新增“可运行项目补齐”策略：
  - Java 后端缺失时补 `pom.xml`、`Application.java`、`application.yml`、基础 controller。
  - Node 后端缺失时补 `backend/package.json`、`backend/src/main.js`。
  - Vue 前端缺失时补 `frontend/package.json`、`vite.config.js`、`index.html`、`src/main.js`、`App.vue`。
  - React 前端缺失时补 `frontend/package.json`、`vite.config.ts`、`index.html`、`src/main.tsx`、`App.tsx`。
  - 补齐 `README.md`、`backend/README.md`、`frontend/README.md`、`backend/sql/init.sql`。
- `chat-panel` 新增“暂停生成”按钮：
  - 流式请求绑定 `AbortController`。
  - 用户点击后中止当前请求并保留已生成内容。
  - 中止后可立即继续下一轮提问。

## 验收标准
- 生成代码后，下载包中具备前后端最小可运行结构，不再要求用户手动粘贴骨架文件。
- AI 对话进行中显示“暂停生成”按钮，点击后 1 秒内停止继续输出。
- 中止后输入框可继续发送新问题，不出现死锁状态。

## 非目标
- 本次不覆盖“一键 Docker 全栈启动”。
- 本次不做多语言脚手架细分（如 Go、PHP）。

