# UI美化 - 技术设计

## 组件系统

使用 shadcn/ui 组件系统，保持一致的设计语言。

## 配色方案

- Primary: `#2563eb`（蓝色）
- Background: 白色
- Text: 灰色系（gray-900 / gray-600 / gray-400）
- Accent: 根据场景使用 green / yellow / red

## 字体

系统默认字体栈：
```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

## 动画

- 基础过渡：Tailwind CSS transition 工具类
- 复杂动画：framer-motion（可选，按需引入）
- 加载状态：骨架屏 Skeleton 组件

## 页面结构

```
/                    → 营销首页
/login               → 登录页（左右分栏）
/register            → 注册页（左右分栏）
/dashboard           → Dashboard（顶栏+侧边栏+主区）
/workspace/[id]      → 工作空间详情（双栏）
```
