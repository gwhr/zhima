# file-management: 任务清单

- [x] T1: 创建 lib/storage/oss.ts（阿里云 OSS SDK 封装：上传、下载、删除）
- [x] T2: 实现文件上传接口
- [x] T3: 实现文件下载接口（生成临时签名 URL）
- [x] T4: 实现 zip 打包导出（archiver 库打包后上传到 OSS）
- [x] T5: 实现过期文件清理逻辑（Worker cron 定时任务）

## 验收标准
能上传文件、下载文件、打包下载整个工作空间
