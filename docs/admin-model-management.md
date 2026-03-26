# 管理端模型管理说明

更新时间：2026-03-26

## 1. 入口

- 管理端菜单：`/admin/models`

## 2. 能力

1. 选择代码生成模型（`codeGenModelId`）
2. 选择论文生成模型（`thesisGenModelId`）
3. 配置各模型供应商 Key（Anthropic / DeepSeek / 智谱）
4. 配置 DeepSeek / 智谱 Base URL

## 3. Key 生效优先级

运行时优先级：

1. 管理端保存的 Key（后台覆盖）
2. 环境变量 Key（兜底）

即：如果管理端配置了 Key，会优先使用管理端；未配置则自动回退到 `.env` / 平台环境变量。

## 4. 安全说明

1. 管理端保存的 Key 会加密后存入 `SystemConfig`
2. 管理端读取接口只返回掩码，不返回明文
3. 加密密钥优先使用 `CONFIG_ENCRYPTION_SECRET`，未配置时回退 `NEXTAUTH_SECRET`

## 5. 接口

- `GET /api/admin/models`
- `PATCH /api/admin/models`

PATCH 可更新：

- `codeGenModelId`
- `thesisGenModelId`
- `anthropicApiKey`
- `deepseekApiKey`
- `zhipuApiKey`
- `deepseekBaseUrl`
- `zhipuBaseUrl`

## 6. 运行建议

1. 本地开发优先先配环境变量，确保初次可启动
2. 上线后可通过管理端做 Key 轮换，避免频繁改环境变量
3. 如果修改了环境变量本身，需重启 `web + worker`
