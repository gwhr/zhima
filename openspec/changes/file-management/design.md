# file-management: 技术设计

## 模块结构
```
lib/storage/
└── oss.ts    # 阿里云 OSS SDK 封装：上传、下载、删除
```

## OSS 目录结构
```
bucket/
└── workspace/
    └── {workspaceId}/
        ├── code/           # 代码文件
        ├── thesis/         # 论文文件
        ├── charts/         # 图表
        └── ...
```

## 上传流程
- 前端 multipart/form-data 上传
- 后端校验 workspace 归属后，调用 oss.upload()
- 数据库记录文件元信息（WorkspaceFile 表：path, storageKey, size）

## 下载流程
- 单文件：根据 storageKey 生成 OSS 临时签名 URL（有效期 1 小时）
- 打包：archiver 流式打包 workspace 下所有文件，上传到 OSS 临时路径，返回签名 URL

## 过期清理
- Worker cron 每日执行
- 查询 status=EXPIRED 的 workspace，删除对应 OSS 目录
