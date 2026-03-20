# 运行预览 - 技术设计

## 方案概述

服务端根据工作空间的需求信息（角色、功能模块、数据库表）动态生成一个完整的 Vue 3 单页应用 HTML，通过 iframe 沙盒渲染在预览弹窗中。

## API 设计

### GET /api/workspace/[id]/preview-build

根据数据库中的 workspace.requirements 动态构建 HTML 页面。

- 响应: `text/html`，完整的可运行 HTML 文件
- Headers: `X-Frame-Options: SAMEORIGIN`

### 生成逻辑

1. 读取 workspace 的 requirements（roles, modules, tables）
2. 根据 tables 生成 Mock 数据（内置常见表的模板：users, books, orders 等）
3. 根据 modules 生成侧边导航菜单
4. 构建包含仪表盘（统计卡片 + 最近操作 + 角色列表）和模块数据表的完整页面

## 组件设计

### 生成的预览页面结构

- 左侧导航栏：项目名称 + 功能模块菜单 + 用户信息
- 顶部操作栏：模块名称 + 搜索框 + 新增按钮
- 仪表盘页：统计卡片 + 最近操作表 + 系统角色
- 模块页：功能标签 + 数据表格（含编辑/删除按钮）+ 搜索过滤
- Toast 提示：新增/编辑/删除操作反馈

### iframe 渲染

- `sandbox="allow-scripts"` 限制安全范围
- 加载状态遮罩 + Loading 动画
- 刷新按钮重新加载

### 底部说明条

蓝色信息条，说明文案：
> 当前为界面效果演示，使用预置示例数据呈现系统完整功能与交互流程。下载项目后，按照本地部署指南完成数据库初始化，系统将自动连接您配置的真实数据源。

## 依赖

- Vue 3 CDN（`https://unpkg.com/vue@3/dist/vue.global.prod.js`）
