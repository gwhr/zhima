import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { downloadFile } from "@/lib/storage/oss";

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
    const buf = await downloadFile(file.storageKey);
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
