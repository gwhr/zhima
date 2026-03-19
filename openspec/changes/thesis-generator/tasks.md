# thesis-generator: 任务清单

- [x] T1: 创建 lib/thesis/generator.ts（论文生成主流程）
- [x] T2: 创建 lib/thesis/templates/（内置模板定义，字体/行距/页边距）
- [x] T3: 创建 lib/thesis/docx-builder.ts（用 docx 库构建 Word 文档）
- [x] T4: 实现分章节 AI 生成（逐章调用 DeepSeek，传入项目上下文）
- [x] T5: 实现图表占位符替换（生成后插入图片）
- [x] T6: 实现 POST /api/workspace/[id]/thesis/generate
- [x] T7: 实现 GET /api/workspace/[id]/thesis（返回下载链接）
- [x] T8: Worker 中添加 thesis-generate 任务处理器

## 验收标准
输入需求清单，能生成完整论文 .docx，格式正确可打开
