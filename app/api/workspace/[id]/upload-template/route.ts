import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { uploadFile, deleteFile } from "@/lib/storage/oss";
import * as path from "path";

const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024; // 10MB
const TEMPLATE_PATH_PREFIX = "templates/论文模板";
const ALLOWED_EXTENSIONS = new Set([".doc", ".docx"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return error("请上传论文模板文件", 400);
  }

  if (file.size <= 0) {
    return error("模板文件不能为空", 400);
  }
  if (file.size > MAX_TEMPLATE_SIZE) {
    return error("模板文件大小不能超过 10MB", 400);
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return error("仅支持 .doc 或 .docx 模板文件", 400);
  }

  const storageKey = `workspaces/${id}/templates/论文模板${ext}`;
  const dbPath = `${TEMPLATE_PATH_PREFIX}${ext}`;

  const oldTemplates = await db.workspaceFile.findMany({
    where: {
      workspaceId: id,
      type: "CONFIG",
      path: { startsWith: TEMPLATE_PATH_PREFIX },
      NOT: { path: dbPath },
    },
  });

  const content = Buffer.from(await file.arrayBuffer());
  await uploadFile(storageKey, content);

  const record = await db.workspaceFile.upsert({
    where: { workspaceId_path: { workspaceId: id, path: dbPath } },
    create: {
      workspaceId: id,
      path: dbPath,
      type: "CONFIG",
      storageKey,
      size: content.length,
    },
    update: {
      storageKey,
      size: content.length,
    },
  });

  await Promise.all(
    oldTemplates.map(async (old) => {
      await db.workspaceFile.delete({ where: { id: old.id } });
      await deleteFile(old.storageKey);
    })
  );

  return success({
    id: record.id,
    path: record.path,
    size: record.size,
    originalName: file.name,
  });
}
