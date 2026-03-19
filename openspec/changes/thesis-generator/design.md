# thesis-generator: 技术设计

## 模块结构
```
lib/thesis/
├── generator.ts        # 论文生成主流程（编排章节、调用 AI）
├── docx-builder.ts     # 用 docx 库构建 Word 文档
└── templates/         # 内置模板定义（字体/行距/页边距）
```

## 数据流
```
需求清单 + 项目代码 → generator.ts → 逐章调用 DeepSeek
                                    ↓
docx-builder.ts ← 章节内容 + 图表（chart-renderer）→ 输出 .docx
```

## 模板设计
- 每套模板定义：字体（宋体/黑体）、字号、行距、页边距、标题样式
- 模板以 JSON 或 TS 配置形式存储，docx-builder 读取后应用

## 图表占位符
- 章节内容中预留 `{{CHART:chartId}}` 占位符
- 生成完成后，根据 chartId 从 chart-renderer 获取图片，替换插入

## 异步任务
- POST 触发生成后，放入 Worker 队列（thesis-generate 任务）
- 生成完成后存储到 OSS，数据库记录文件路径
- GET 接口返回临时签名 URL 供下载
