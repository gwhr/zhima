# file-management: 需求规格

## 存储策略
- 文件存储到阿里云 OSS
- 按 workspace_id 分目录：`workspace/{workspaceId}/{path}`

## 功能
- 单文件上传
- 单文件下载（生成临时签名 URL）
- 整体 zip 打包导出（archiver 库打包后上传到 OSS）

## 接口设计
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/workspace/[id]/files/upload | 上传文件 |
| GET | /api/workspace/[id]/export | zip 打包下载 |

## 清理策略
- Worker cron 定时任务清理过期工作空间文件
