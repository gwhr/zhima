# project-init: 需求规格

## 1. 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 14+ |
| 语言 | TypeScript | 5.x |
| UI | TailwindCSS + shadcn/ui | 最新 |
| ORM | Prisma | 最新 |
| 数据库 | PostgreSQL | 16 |
| 缓存 | Redis | 7 |
| 包管理 | pnpm | — |

## 2. 数据库表设计（Prisma Schema）

### 2.1 用户表 User
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| phone | String? | 手机号（加密存储） |
| email | String? | 邮箱 |
| password | String | bcrypt 哈希 |
| name | String? | 昵称 |
| avatar | String? | 头像 URL |
| role | Enum (USER, ADMIN) | 角色 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 2.2 工作空间表 Workspace
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| userId | String | 所属用户 |
| name | String | 项目名称 |
| topic | String | 选题 |
| techStack | Json | 技术栈配置 |
| requirements | Json | 需求清单 |
| status | Enum (DRAFT, GENERATING, READY, EXPIRED) | 状态 |
| expiresAt | DateTime | 过期时间 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 2.3 订单表 Order
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| userId | String | 所属用户 |
| workspaceId | String? | 关联工作空间 |
| planType | Enum (BASIC, STANDARD, PREMIUM) | 套餐类型 |
| amount | Decimal | 金额（分） |
| status | Enum (PENDING, PAID, REFUNDED, EXPIRED) | 状态 |
| paymentChannel | String? | 支付渠道 |
| tradeNo | String? | 第三方交易号 |
| paidAt | DateTime? | 支付时间 |
| createdAt | DateTime | 创建时间 |

### 2.4 用户额度表 UserQuota
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| userId | String | 所属用户 |
| workspaceId | String | 关联工作空间 |
| planType | Enum | 套餐类型 |
| opusBudget | Decimal | Opus 额度上限（元） |
| opusUsed | Decimal | 已消耗 Opus（元） |
| modifyLimit | Int | 修改次数上限 |
| modifyUsed | Int | 已用修改次数 |
| previewLimit | Int | 预览次数上限 |
| previewUsed | Int | 已用预览次数 |

### 2.5 AI 调用记录表 AiUsageLog
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| userId | String | 用户 |
| workspaceId | String | 工作空间 |
| taskType | Enum (TOPIC, EVALUATE, CODE_GEN, THESIS, CHART, MODIFY_SIMPLE, MODIFY_COMPLEX) | 任务类型 |
| model | String | 使用模型 |
| inputTokens | Int | 输入 tokens |
| outputTokens | Int | 输出 tokens |
| costYuan | Decimal | 成本（元） |
| durationMs | Int | 耗时 |
| createdAt | DateTime | 记录时间 |

### 2.6 对话消息表 ChatMessage
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| workspaceId | String | 所属工作空间 |
| role | Enum (USER, ASSISTANT, SYSTEM) | 角色 |
| content | Text | 消息内容 |
| metadata | Json? | 附加数据（工具调用结果等） |
| createdAt | DateTime | 创建时间 |

### 2.7 工作空间文件表 WorkspaceFile
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| workspaceId | String | 所属工作空间 |
| path | String | 文件路径 |
| type | Enum (CODE, THESIS, CHART, CONFIG) | 文件类型 |
| storageKey | String | OSS 存储键 |
| size | Int | 文件大小(bytes) |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 2.8 通知表 Notification
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| userId | String | 用户 |
| type | Enum (GENERATE_DONE, QUOTA_WARNING, EXPIRY_WARNING, SYSTEM) | 类型 |
| title | String | 标题 |
| content | String | 内容 |
| isRead | Boolean | 是否已读 |
| createdAt | DateTime | 创建时间 |

### 2.9 邀请码表 InviteCode
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| userId | String | 所属用户 |
| code | String (unique) | 邀请码 |
| usedCount | Int | 已使用次数 |
| rewardTotal | Decimal | 累计奖励额度 |
| createdAt | DateTime | 创建时间 |

### 2.10 任务队列状态表 TaskJob
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| workspaceId | String | 关联工作空间 |
| type | Enum (CODE_GEN, THESIS_GEN, CHART_RENDER, PREVIEW) | 任务类型 |
| status | Enum (PENDING, RUNNING, COMPLETED, FAILED) | 状态 |
| progress | Int | 进度百分比 |
| result | Json? | 执行结果 |
| error | String? | 错误信息 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

## 3. 环境变量

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=...
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
OSS_ACCESS_KEY=...
OSS_SECRET_KEY=...
OSS_BUCKET=...
OSS_REGION=...
HUPIJIAO_APPID=...
HUPIJIAO_SECRET=...
RESEND_API_KEY=...
```

## 4. 约束条件
- 所有主键使用 UUID
- 敏感字段（手机号、姓名、学号）AES 加密存储
- 所有时间字段使用 UTC
- API 响应统一格式：`{ success: boolean, data?: T, error?: string }`
