# 生成流程闸门与防误操作 - 技术设计

## 方案概览
通过“前端可视化约束 + 后端强校验 + 状态持久化”三层保证流程正确性：
- 前端：根据任务状态和文件状态控制按钮显示/禁用。
- 后端：在生成接口内校验是否满足前置条件。
- 持久化：在 `workspace.requirements` 中记录 `previewConfirmed` 状态。

## 状态设计
在 `workspace.requirements` 中扩展字段：
- `previewConfirmed?: boolean`
- `previewConfirmedAt?: string`

状态流转：
1. 功能确认完成后允许生成代码。
2. 触发代码生成时，重置 `previewConfirmed = false`。
3. 预览无问题后，用户点击“预览通过”，写入 `previewConfirmed = true`。
4. 论文生成接口仅在 `previewConfirmed = true` 时放行。

## 前端改动
- 页面计算 `isCodeGenerating` / `isAnyJobRunning`。
- 代码生成期间禁用“操作”卡片按钮，避免重复触发。
- 当检测到代码生成已启动（存在 CODE_GEN 任务或代码文件）后，不再显示“重新调整并评估”按钮。
- 论文生成按钮新增前置条件：
  - 已有代码文件；
  - 已完成预览确认；
  - 当前无代码生成进行中。

## 后端改动
- `POST /generate-code`：
  - 创建任务前将 `previewConfirmed` 重置为 `false`。
- 新增 `POST /confirm-preview`：
  - 校验代码任务不在运行；
  - 校验已有代码文件；
  - 写入预览确认状态。
- `POST /generate-thesis`：
  - 校验代码文件存在；
  - 校验 `previewConfirmed = true`；
  - 若代码仍在生成中，直接拒绝。
- `POST /confirm-requirements`：
  - 若代码生成已启动且 action=revise，拒绝调整。

## 依赖修复
- 补充 `proxy-agent` 依赖，解决预览链路触发 `ali-oss/urllib` 时的模块缺失问题。
