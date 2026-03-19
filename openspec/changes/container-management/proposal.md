# container-management: 容器管理

## 目标
通过 Docker 临时容器让用户预览自己的项目运行效果。点击预览→启动容器→注入代码→30 分钟后自动销毁。

## 技术方案
- 使用 Dockerode（Node.js Docker SDK）管理容器生命周期
- 支持 Node+MySQL、Java+MySQL、Python+MySQL 等镜像

## 交付物
- 容器启动/停止/销毁管理
- 代码注入（工作空间代码挂载到容器）
- 预览启动/停止 API
- 30 分钟无操作自动回收
- Worker 任务处理器

## 优先级
🟠 P1 — 第二批
