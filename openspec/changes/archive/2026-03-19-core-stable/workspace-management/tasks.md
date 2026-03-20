# workspace-management: 任务清单

- [x] T1: 实现 POST /api/workspace（创建工作空间，含选题+技术栈）
- [x] T2: 实现 GET /api/workspace（列表，只返回当前用户的）
- [x] T3: 实现 GET /api/workspace/[id]（详情，含权限校验）
- [x] T4: 实现 DELETE /api/workspace/[id]（软删除）
- [x] T5: 实现 GET /api/workspace/[id]/files（文件树）
- [x] T6: 实现 GET /api/workspace/[id]/files/[fileId]（文件内容，从 OSS 读取）
- [x] T7: 创建工作空间列表页面 app/(dashboard)/workspace/page.tsx
- [x] T8: 创建工作空间详情页面 app/(dashboard)/workspace/[id]/page.tsx（含文件树+代码预览）
- [x] T9: 创建选题+技术栈选择表单组件
- [x] T10: 创建需求清单展示+编辑组件

## 验收标准
1. ✅ 能创建工作空间，选择选题和技术栈
2. ✅ 工作空间列表只显示自己的
3. ✅ 文件树能正确展示层级结构
