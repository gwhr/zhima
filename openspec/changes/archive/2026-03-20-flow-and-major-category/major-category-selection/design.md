# 专业分类选择与适配提示 - 技术设计

## 方案概览
通过“前端显式选择 + 接口参数透传 + requirements 持久化”实现专业分类管理：
- 前端创建向导新增 `majorCategory` 字段。
- AI 推荐题目、需求扩展接口按分类拼接不同提示词约束。
- 创建工作空间时将分类写入 `requirements.majorCategory`。
- 详情页读取并显示“计算机专业模式 / 非计算机专业模式”。

## 数据设计
在 `requirements` JSON 中扩展字段：
- `majorCategory?: "computer" | "non-computer"`
- `majorCategoryLabel?: string`

兼容策略：
- 旧工作空间无该字段时，默认按 `computer` 处理。

## 接口改动
1. `POST /api/ai/recommend-topics`
- 入参新增 `majorCategory`（可选）。
- 默认值 `computer`。
- `non-computer` 时提示词强调“可落地的信息化系统题目 + 难度可控”。

2. `POST /api/ai/expand-requirements`
- 入参新增 `majorCategory`（可选）。
- `non-computer` 时要求角色与模块更偏业务流程表达，减少复杂工程实现描述。

3. `POST /api/workspace`
- 接收并校验 `requirements.majorCategory`。
- 若缺失或非法，落默认 `computer`。

## 前端改动
- `create-workspace-dialog` 增加“专业分类”下拉与提示文案。
- 非计算机专业选项显示说明：当前模式将优先生成“信息系统型毕设”。
- `workspace/[id]/page` 项目概览展示分类标签。

## 风险与缓解
- 风险：分类被后续“需求重分析”覆盖丢失。
- 缓解：`confirm-requirements` 的 `normalizeRequirements` 保留并回写 `majorCategory` 字段。
