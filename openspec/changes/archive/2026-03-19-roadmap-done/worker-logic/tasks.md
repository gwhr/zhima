# Worker实际生成逻辑 - 任务列表

## 实现任务

- [x] T1: 实现 Worker code-gen 处理器（调用AI+解析文件+存储）
- [x] T2: 创建代码文件解析器 lib/parser/code-parser.ts
- [x] T3: 实现 Worker thesis-gen 处理器（分章节生成+合并）
- [x] T4: 创建 docx 文档生成器 lib/thesis/docx-builder.ts
- [x] T5: 实现 Worker chart-render 处理器（Mermaid→图片）
- [x] T6: 创建图表渲染器 lib/chart/renderer.ts
- [x] T7: 在生成API中添加BullMQ任务入队逻辑（lib/queue.ts + API 调用 taskQueue.add()）
- [x] T8: 实现任务进度轮询前端组件（步骤卡片内联进度条）
- [x] T9: 生成完成后自动创建通知
- [x] T10: 端到端测试：创建工作空间→触发生成→查看结果

## 修复记录

- **修复**: API 路由只写 DB 未投递 BullMQ 队列 → 新建 `lib/queue.ts`，generate-code/generate-thesis 加 `taskQueue.add()`
- **修复**: Worker 用 `dotenv/config` 只读 `.env` → 改为先加载 `.env.local` 再加载 `.env`
