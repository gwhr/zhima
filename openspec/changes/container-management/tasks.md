# container-management: 任务清单

- [x] T1: 创建 lib/docker/manager.ts（Dockerode 封装：启动/停止/销毁容器）
- [x] T2: 准备 Docker 镜像（node+mysql / java+mysql / python+mysql）
- [x] T3: 实现代码注入逻辑（将工作空间代码挂载到容器）
- [x] T4: 实现 POST /api/workspace/[id]/preview/start（启动预览）
- [x] T5: 实现 POST /api/workspace/[id]/preview/stop（停止预览）
- [x] T6: 实现容器自动回收（30 分钟无操作销毁）
- [x] T7: Worker 中添加 preview 任务处理器

## 验收标准
点击预览能启动容器，返回临时访问链接，30 分钟后自动销毁

注：此模块为后期功能，当前为 API 骨架/占位实现。
