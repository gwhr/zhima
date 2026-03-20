# 生成流程闸门与防误操作 - 规格

## 功能需求

### 1) 需求调整入口锁定
- 当工作空间已进入代码生成阶段（存在 `CODE_GEN` 任务记录或已有代码文件）后：
  - 前端不再显示“重新调整并评估”入口。
  - 后端拒绝 `action=revise` 的需求重分析请求。

### 2) 代码生成期间防重复触发
- 当代码生成任务处于 `PENDING`/`RUNNING`：
  - “操作”区域相关按钮必须禁用。
  - 用户不可重复触发生成动作。

### 3) 论文生成前置闸门
- 论文生成必须满足：
  - 存在代码文件；
  - 预览确认已完成（`previewConfirmed = true`）；
  - 不存在运行中的代码生成任务。
- 不满足时接口返回 4xx 和明确错误信息。

### 4) 预览确认接口
- 新增 `POST /api/workspace/:id/confirm-preview`
- 行为：
  - 校验权限；
  - 校验代码文件存在；
  - 校验代码任务不在运行；
  - 写入 `requirements.previewConfirmed=true` 与时间戳。

### 5) 依赖完整性
- 项目依赖需包含 `proxy-agent`，以避免预览链路构建时报 `Can't resolve 'proxy-agent'`。

## 兼容性
- 历史工作空间如无 `previewConfirmed` 字段，按 `false` 处理。
