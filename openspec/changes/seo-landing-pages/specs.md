# seo-landing-pages: 需求规格

## 数据存储
- 数据库存储热门选题数据
- 字段：题目、描述、技术栈、需求清单预览、论文大纲预览

## 页面路由
- 每个选题一个页面：`/topic/[slug]`
- Next.js SSG 静态生成

## 内容策略
- 页面内容由 AI 预生成并缓存
- 支持 meta 标签优化（title、description、keywords）

## SEO 能力
- 自动生成 sitemap.xml
- 语义化 HTML 结构

## 转化
- 底部 CTA：「免费体验完整生成」引导注册
