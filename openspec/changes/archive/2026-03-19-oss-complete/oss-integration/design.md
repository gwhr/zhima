# 真实OSS接入 - 技术设计

## SDK

使用阿里云 OSS Node.js SDK (`ali-oss`)。

## 目录结构

```
workspaces/{workspaceId}/{type}/{filename}
```

- type: `code` / `thesis` / `chart`
- 示例: `workspaces/abc123/code/src/index.ts`

## 环境切换

通过环境变量控制存储后端：

- `STORAGE_PROVIDER=local`: 本地文件模拟（开发环境）
- `STORAGE_PROVIDER=oss`: 阿里云 OSS（生产环境）

## 模块

`lib/storage/oss.ts`:
- 统一的存储接口（upload / download / getSignedUrl / delete）
- 根据环境变量自动切换实现

## OSS 配置

```env
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx
OSS_BUCKET=plantcloud
```

---

## ZIP 打包下载（已实现，2026-03-18）

### 接口

```
GET /api/workspace/[id]/download?type=code|thesis|chart|all
```

### 技术方案

使用已有依赖 `jszip`（无需新增依赖）：

```
DB.workspaceFile (按 type 筛选)
    ↓
fs.readFile(.storage/{storageKey})
    ↓
JSZip.file(zipPath, buffer)   // all 时 zipPath = "code/xxx" / "thesis/xxx"
    ↓
zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", level: 6 })
    ↓
Response(zipBuffer, {
  "Content-Type": "application/zip",
  "Content-Disposition": attachment; filename*=UTF-8''<项目名>_<类型>.zip
})
```

### 前端触发

```ts
function downloadFiles(type) {
  const a = document.createElement("a");
  a.href = `/api/workspace/${id}/download?type=${type}`;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
```

四个下载入口：右侧卡片（代码/论文/图表各一个） + 步骤 3（下载全部）。

---

## 论文模板上传（已实现，2026-03-19）

### 接口

```
POST /api/workspace/[id]/upload-template
Content-Type: multipart/form-data
field: file
```

### 约束

- 仅允许 `.doc` / `.docx`
- 文件大小 <= 10MB
- 使用 `workspaceId + 固定路径` 覆盖同一工作空间的旧模板

### 存储

- 磁盘路径：`.storage/workspaces/{workspaceId}/templates/论文模板.{ext}`
- 数据库：`workspaceFile`
- `type = CONFIG`
- `path = templates/论文模板.{ext}`

### 前端入口

- 工作空间详情右侧“项目文件”卡片新增“论文模板（可选）”
- 点击“上传模板”后通过 `fetch + FormData` 调用接口
- 成功后刷新文件列表并展示当前模板文件名/大小
