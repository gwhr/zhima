# multi-platform-publish: 多平台自动发布

## 目标
通过 RPA 脚本自动将推广内容发布到各社交平台（CSDN、知乎、小红书）。

## 技术方案
- **CSDN / 知乎**：使用 HTTP 接口发布
- **小红书**：使用 Puppeteer 自动化（无公开 API）

## 交付物
- CSDN 文章发布（HTTP API）
- 知乎回答/文章发布（HTTP API）
- 小红书 RPA 自动发布（Puppeteer 登录+发帖）
- 发布 API（选择平台→发布内容）
- 定时自动发布（Worker cron，每日执行）
- 已发布内容记录（避免重复发布）

## 优先级
🟢 P2 — 第三批
