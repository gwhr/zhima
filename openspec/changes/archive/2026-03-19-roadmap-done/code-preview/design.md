# 文件预览 - 技术设计

## 方案概述

在预览弹窗中提供"文件浏览"Tab，左侧文件树按类型分组（源代码/论文），右侧展示文件内容，支持语言识别和复制。

## API 设计

### GET /api/workspace/[id]/files/[fileId]

读取 `.storage/` 目录下的实际文件内容并返回。

- 响应体: `{ success: true, data: { id, path, type, size, storageKey, content } }`
- 二进制文件（.docx）返回提示文本，非二进制文件以 UTF-8 读取
- 路径安全校验：`path.resolve()` 必须在 `.storage/` 范围内

## 组件设计

### CodePreviewDialog (`components/code-preview-dialog.tsx`)

- 双Tab切换：运行预览 / 文件浏览
- 文件树侧边栏（w-56）：按 CODE / THESIS 分组，显示文件名和大小
- 内容区：语言标签 + 复制按钮 + 等宽字体代码渲染
- 弹窗尺寸：96vw × 93vh（近全屏）

## 依赖

无新增依赖，使用现有 shadcn/ui 组件。
