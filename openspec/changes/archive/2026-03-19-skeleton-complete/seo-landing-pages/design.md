# seo-landing-pages: 技术设计

## 数据模型
- Topic 表：slug（唯一）, name, description, techStack（JSON）, preview（需求清单/论文大纲预览）, createdAt

## 路由结构
```
app/(marketing)/
└── topic/
    └── [slug]/
        └── page.tsx    # SSG 页面
```

## 静态生成
- generateStaticParams：从数据库读取所有 Topic，预生成所有选题页面
- 构建时一次性生成，无运行时数据库查询

## Sitemap
- app/sitemap.ts：读取 Topic 表，输出 `/topic/[slug]` 列表
- 符合 sitemap.xml 规范

## 种子数据
- 种子脚本调用 AI 生成 50+ 个热门选题
- 写入 Topic 表，含 slug、name、description、techStack、preview

## CTA 组件
- 页面底部固定 CTA 区块
- 链接到注册页或体验入口
