# codegen-quality-pass - 任务列表

- [x] T1: 升级 Worker code-gen 提示词，增加严格输出规范
- [x] T2: 增加生成结果后处理（路径清洗、去重、命名规整）
- [x] T3: 增加 README 兜底逻辑
- [x] T4: 增加最少文件数校验（低质量输出快速失败）
- [x] T5: 浏览器触发生成代码并验证输出文件结构

## 自测记录

- 2026-03-19: 浏览器工作空间页点击“生成代码”后，任务完成，代码文件成功入库。
- 2026-03-19: `/api/workspace/[id]/files` 返回包含 `README.md`，并出现规整后的路径（如 `backend/src/main/java/com/example/generated/Module1.java`）。
