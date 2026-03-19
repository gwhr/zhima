# 论文图表嵌入 - 技术设计

> 最后更新：2026-03-16

---

## 方案概述

从工作空间的 `requirements` 数据**确定性地**生成 Mermaid 图表代码，通过 Kroki 公共 API 渲染为 SVG，再用 Sharp 在本地转为 PNG Buffer，最终通过 `docx` 库的 `ImageRun` 嵌入到对应章节的 DOCX 文件中。数据库表格则通过 `Table/TableRow/TableCell` 直接用代码构建为 Word 表格。

**关键设计原则：图表在论文生成时同步生成，不是独立步骤。**

---

## 完整技术链路

```
workspace.requirements
  { roles, modules, tables, techStack }
          │
          ▼
lib/chart/diagram-generator.ts
  - generateUseCaseDiagram()   → Mermaid graph LR
  - generateERDiagram()        → Mermaid erDiagram
  - generateArchitectureDiagram() → Mermaid graph TB
  - inferTableSchemas()        → TableSchema[]
          │
          ▼ (Mermaid 文本)
lib/chart/renderer.ts
  - renderMermaidToSvg()       → POST https://kroki.io/mermaid/svg
          │
          ▼ (SVG 字符串)
  - svgToPng()                 → sharp(svgBuffer).resize(800).png().toBuffer()
          │
          ▼ (PNG Buffer + 宽高)
worker/index.ts
  - generateDiagramsPng()      → { architecture, er, useCase, svgs }
  - 同时将 SVG 作为 CHART 文件保存到 .storage/
          │
          ▼
lib/thesis/docx-builder.ts
  - buildDocx()
    ├── ImageRun(pngBuffer)    → 图片段落（居中，自动缩放）
    ├── captionParagraph()     → 图题说明（图 X-X 系统架构图）
    └── buildFieldTable()      → Table/TableRow/TableCell（字段名/类型/说明）
          │
          ▼
.storage/workspaces/{id}/thesis/毕业论文.docx  (~80KB)
.storage/workspaces/{id}/charts/*.svg          (副产物，供单独下载)
```

---

## 各阶段技术详解

### 第一阶段：Mermaid 代码生成（纯计算，无 AI）

文件：`lib/chart/diagram-generator.ts`

**用例功能图（graph LR）**

```
graph LR
  R_系统管理员["👤 系统管理员"]
  M_用户管理模块{"用户管理模块"}
  F_用户管理_用户注册["用户注册"]
  M_用户管理模块 --> F_用户管理_用户注册
  R_系统管理员 --> M_用户管理模块
```

- 数据来源：`requirements.roles` + `requirements.modules`
- 角色 → 模块 的连线通过 `isRoleRelatedToModule()` 启发式推断（关键词匹配）

**ER 关系图（erDiagram）**

```
erDiagram
  users {
    bigint id "PK 主键"
    varchar username "用户名"
    ...
  }
  users ||--o{ borrow_records : "借阅人ID"
```

- 数据来源：`requirements.tables`
- 字段由 `inferTableSchemas()` 生成：内置 users/books/orders/products/categories 等常见表的字段模板；未知表名生成通用 6 字段（id/name/description/status/created_at/updated_at）
- 外键关系通过字段名 `_id` 后缀自动推断（`user_id` → 连向 `users` 表）

**系统架构图（graph TB 含子图）**

```
graph TB
  subgraph Client["🖥️ 客户端"]
    Browser["浏览器"]
    Browser --> FE["vue3"]
  end
  subgraph Server["⚙️ 服务端"]
    API["java-springboot REST API"]
    subgraph Services["业务模块"]
      SVC_用户管理["用户管理模块"]
    end
    API --> Services
  end
  subgraph Data["💾 数据层"]
    DB[("mysql")]
  end
  FE -->|HTTP 请求| API
  Services -->|SQL| DB
```

- 数据来源：`workspace.techStack`（frontend/backend/database）+ `requirements.modules`

---

### 第二阶段：Mermaid → SVG（Kroki 公共 API）

文件：`lib/chart/renderer.ts`

```typescript
const res = await fetch("https://kroki.io/mermaid/svg", {
  method: "POST",
  headers: { "Content-Type": "text/plain" },
  body: mermaidCode,
  signal: AbortSignal.timeout(30000),  // 30s 超时
});
```

- **服务**：[Kroki.io](https://kroki.io) — 开源的图表渲染聚合服务，免费公共实例
- **输入**：Mermaid DSL 文本（UTF-8 纯文本 POST 请求体）
- **输出**：SVG 字符串（含完整样式，可独立渲染）
- **超时保护**：30 秒，超时则该图跳过（不阻断论文生成）

---

### 第三阶段：SVG → PNG（Sharp 本地转换）

文件：`lib/chart/renderer.ts`

```typescript
const png = await sharp(Buffer.from(svg))
  .resize({ width: 800, withoutEnlargement: true })
  .png()
  .toBuffer();
const meta = await sharp(png).metadata();  // 获取实际宽高
```

- **库**：[sharp](https://sharp.pixelplumbing.com/) — 基于 libvips 的高性能 Node.js 图像处理库
- **为什么不直接用 SVG**：`docx` 库的 `ImageRun` 不支持 SVG，只支持 PNG/JPEG/GIF/WEBP
- **宽度统一为 800px**：防止 Mermaid 生成的超宽图片撑破 Word 页面，同时 `withoutEnlargement` 不放大小图
- **输出**：PNG Buffer + 实际宽高（用于 DOCX 中等比缩放）

---

### 第四阶段：PNG 嵌入 DOCX（docx 库）

文件：`lib/thesis/docx-builder.ts`

**图片插入**

```typescript
new Paragraph({
  children: [
    new ImageRun({
      data: img.pngBuffer,        // PNG Buffer
      transformation: { width: w, height: h },  // EMU 单位（Points）
      type: "png",
    }),
  ],
  alignment: AlignmentType.CENTER,
})
```

- 插入位置由章节 key 控制：
  - `requirements` 章末 → 用例功能图（图 2-1）
  - `design` 章末 → 系统架构图（图 3-1）+ ER图（图 3-2）
- 等比缩放：`scale = min(1, 550pt / (原始像素宽 / 96dpi * 72pt))`

**字段表格插入**

```typescript
new Table({
  rows: [
    new TableRow({
      children: ["字段名", "数据类型", "说明"].map(text =>
        new TableCell({ children: [...], shading: { color: "E8E8E8" } })
      ),
      tableHeader: true,
    }),
    ...fieldRows,
  ],
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: { ... BorderStyle.SINGLE ... }
})
```

- 插入位置：`design` 章末，紧随 ER 图之后
- 每张表单独一个 Word 表格，表名作为表题（居中加粗）

---

## DOCX 整体结构

| 位置 | 内容 | 实现方式 |
|------|------|---------|
| 封面 | 标题 + 作者 + 年份 | Paragraph + TextRun（宋黑双字体）|
| 目录 | 自动生成占位 | TableOfContents（需在 Word 中手动更新域）|
| 第一章 绪论 | AI 生成 | Markdown → Paragraph 转换 |
| 第二章 需求分析 | AI 生成 + **用例功能图** | imageParagraph() |
| 第三章 系统设计 | AI 生成 + **系统架构图** + **ER图** + **字段表格** | imageParagraph() + buildFieldTable() |
| 第四章 系统实现 | AI 生成 | — |
| 第五章 系统测试 | AI 生成 | — |
| 第六章 总结与展望 | AI 生成 | — |
| 参考文献 | 预设 10 条 | bodyParagraph() |
| 致谢 | 预设模板 | bodyParagraph() |

**页面格式**：A4，上下右边距 1440 pt（2.5cm），左边距 1800 pt（3.2cm，装订线）  
**正文字体**：宋体（SimSun）12pt，行距 1.5 倍  
**标题字体**：黑体（SimHei）  
**页眉**：论文标题居中  
**页脚**：页码居中

---

## 三方依赖

| 依赖 | 版本 | 用途 | 引入方式 |
|------|------|------|---------|
| `sharp` | latest | SVG Buffer → PNG Buffer | `pnpm add sharp` |
| `docx` | ≥8.x | 生成 DOCX 文件结构 | 已有 |
| Kroki API | 公共实例 | Mermaid 文本 → SVG | HTTP POST，无需 key |

---

## 已知限制

| 限制 | 说明 |
|------|------|
| Kroki 依赖外网 | 部署到无公网环境需自建 Kroki 实例（Docker 可用）|
| 图表为确定性生成 | 不经 AI，内容完全由 requirements 数据决定，对于特殊系统可能不准确 |
| 目录需手动更新 | Word 的 `TableOfContents` 需用户在 Word 中右键→更新域才能显示页码 |
| SVG 中的中文字体 | Kroki 服务端未必有中文字体，部分标签可能显示为方块（已知但不影响论文质量）|
