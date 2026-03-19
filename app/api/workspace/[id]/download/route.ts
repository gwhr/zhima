import { db } from "@/lib/db";
import { error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import JSZip from "jszip";
import * as fs from "fs/promises";
import * as path from "path";

const STORAGE_DIR = path.join(process.cwd(), ".storage");

// type 参数: code | thesis | chart | all
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "all";

  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  // 根据 type 筛选文件
  const typeMap: Record<string, string[]> = {
    code:   ["CODE"],
    thesis: ["THESIS"],
    chart:  ["CHART"],
    all:    ["CODE", "THESIS", "CHART"],
  };
  const allowedTypes = typeMap[type] ?? typeMap.all;

  const files = await db.workspaceFile.findMany({
    where: { workspaceId: id, type: { in: allowedTypes } },
    orderBy: { path: "asc" },
  });

  if (files.length === 0) {
    return error("暂无可下载的文件", 404);
  }

  const zip = new JSZip();
  let addedCount = 0;

  for (const file of files) {
    try {
      const filePath = path.join(STORAGE_DIR, file.storageKey);
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(STORAGE_DIR))) continue;

      const buf = await fs.readFile(resolved);
      // 在 ZIP 内按 type 分目录存放
      const zipPath = type === "all"
        ? `${file.type.toLowerCase()}/${file.path}`
        : file.path;
      zip.file(zipPath, buf);
      addedCount++;
    } catch {
      // 跳过读取失败的文件
    }
  }

  if (addedCount === 0) {
    return error("文件读取失败，请重新生成后下载", 500);
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const filenameSuffix = type === "all" ? "全部文件" : {
    code: "项目源代码",
    thesis: "毕业论文",
    chart: "图表文件",
  }[type] ?? type;

  const projectName = workspace.name.replace(/[^\w\u4e00-\u9fff]/g, "_").slice(0, 30);
  const filename = `${projectName}_${filenameSuffix}.zip`;

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(zipBuffer.length),
      "Cache-Control": "no-store",
    },
  });
}
