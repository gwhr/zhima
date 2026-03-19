# Worker实际生成逻辑 - 技术设计

## 代码解析

- 正则匹配 AI 输出中的 ` ```filepath:xxx ` 格式
- 提取文件路径和文件内容
- 模块: `lib/parser/code-parser.ts`

## 论文 docx 生成

- 使用 `docx` npm 包
- 支持标题、段落、列表、表格等基本格式
- 模块: `lib/thesis/docx-builder.ts`

## 图表渲染

- 方案 A: 调用 Kroki API（`https://kroki.io`）
- 方案 B: 使用 mermaid-cli 本地渲染
- 模块: `lib/chart/renderer.ts`

## 进度广播

- 前端轮询 `/api/workspace/[id]/jobs` 获取任务进度
- TaskJob 表 progress 字段: 0-100 整数
- 状态: pending → processing → completed / failed

## Worker 处理器结构

```
worker/processors/
  ├── code-gen.ts      # 代码生成处理器
  ├── thesis-gen.ts    # 论文生成处理器
  └── chart-render.ts  # 图表渲染处理器
```
