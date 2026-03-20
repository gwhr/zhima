# workspace-management: 需求规格

## 工作空间生命周期
```
创建（选题+技术栈）→ 需求展开 → 用户确认 → 生成中 → 就绪 → 使用/修改 → 过期
```

## 接口设计
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/workspace | 创建工作空间 |
| GET | /api/workspace | 获取我的工作空间列表 |
| GET | /api/workspace/[id] | 获取工作空间详情 |
| DELETE | /api/workspace/[id] | 删除工作空间 |
| GET | /api/workspace/[id]/files | 获取文件树 |
| GET | /api/workspace/[id]/files/[fileId] | 获取文件内容 |
| PATCH | /api/workspace/[id]/status | 更新工作空间状态 |

## 技术栈选项
- 后端：Node.js(Express/Koa) / Java(SpringBoot) / Python(FastAPI/Flask)
- 数据库：MySQL / PostgreSQL / MongoDB
- 前端：Vue3 / React

## 需求清单
- AI 自动展开功能模块、角色、数据库表
- 用户可增删改模块
- 确认后锁定，作为后续生成的输入
