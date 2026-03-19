# workspace-management: 技术设计

## 数据模型
- Workspace 表关联 User（一对多）
- WorkspaceFile 表关联 Workspace（一对多）
- 文件实际内容存储在 OSS，数据库存 storageKey

## 文件树
- 前端递归渲染文件树组件
- 后端按 workspace 查询所有文件，按 path 构建树结构

## 状态机
```
DRAFT → GENERATING → READY → EXPIRED
            ↓ (失败)
          FAILED → GENERATING (重试)
```
