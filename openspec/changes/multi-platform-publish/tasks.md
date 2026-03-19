# multi-platform-publish: 任务清单

- [x] T1: 创建 lib/promo/publishers/csdn.ts（CSDN 文章发布 HTTP API）
- [x] T2: 创建 lib/promo/publishers/zhihu.ts（知乎回答/文章发布）
- [x] T3: 创建 lib/promo/publishers/xiaohongshu.ts（Puppeteer RPA 自动发布）
- [x] T4: 实现 POST /api/admin/promo/publish（选择平台→发布内容）
- [x] T5: 实现定时自动发布（Worker cron，每日执行）
- [x] T6: 维护已发布内容记录（避免重复发布）

## 验收标准
能一键将文案发布到 CSDN/知乎，小红书 RPA 能自动登录发帖

注：此模块为后期功能，当前为 API 骨架/占位实现。
