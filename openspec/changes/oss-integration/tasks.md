# 真实OSS接入 - 任务列表

## 实现任务

- [x] T1: 安装 ali-oss SDK
- [x] T2: 重构 lib/storage/oss.ts 支持真实OSS和本地模拟切换
- [x] T3: 实现文件上传（带进度回调）
- [x] T4: 实现文件下载和预签名URL
- [x] T5: 实现工作空间文件打包zip下载 /api/workspace/[id]/download（JSZip，支持 code/thesis/chart/all 四种类型，ZIP 内按 type 分目录，filename 含项目名）
- [ ] T6: 实现用户论文模板上传 /api/workspace/[id]/upload-template

## 修复记录

- **修复**: 下载按钮无响应 → 所有 Download 按钮接入 `downloadFiles(type)` 函数，使用 `<a download>` 触发浏览器下载
- [x] T7: 测试OSS读写全流程
