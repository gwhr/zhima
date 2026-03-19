import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import * as fs from "fs/promises";
import * as path from "path";

const STORAGE_DIR = path.join(process.cwd(), ".storage");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id, fileId } = await params;

  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  const file = await db.workspaceFile.findUnique({
    where: { id: fileId, workspaceId: id },
  });

  if (!file) return error("文件不存在", 404);

  let content = "";
  try {
    const filePath = path.join(STORAGE_DIR, file.storageKey);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(STORAGE_DIR))) {
      return error("非法路径", 403);
    }
    const buf = await fs.readFile(resolved);
    if (file.path.endsWith(".docx")) {
      content = "[二进制文件，请下载查看]";
    } else {
      content = buf.toString("utf-8");
    }
  } catch {
    content = "[文件读取失败]";
  }

  return success({
    id: file.id,
    path: file.path,
    type: file.type,
    size: file.size,
    storageKey: file.storageKey,
    content,
  });
}
