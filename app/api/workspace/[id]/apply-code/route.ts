import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import * as fs from "fs/promises";
import * as path from "path";

const STORAGE_DIR = path.join(process.cwd(), ".storage");

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const { filePath, content } = await req.json();

  if (!filePath || typeof content !== "string") {
    return error("缺少 filePath 或 content", 400);
  }

  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== session!.user.id) {
    return error("无权限", 403);
  }

  const storageKey = `workspaces/${id}/code/${filePath}`;
  const diskPath = path.join(STORAGE_DIR, storageKey);
  const resolved = path.resolve(diskPath);
  if (!resolved.startsWith(path.resolve(STORAGE_DIR))) {
    return error("非法路径", 403);
  }

  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, "utf-8");

  const fileSize = Buffer.byteLength(content);

  const file = await db.workspaceFile.upsert({
    where: { workspaceId_path: { workspaceId: id, path: filePath } },
    create: {
      workspaceId: id,
      path: filePath,
      type: "CODE",
      storageKey,
      size: fileSize,
    },
    update: {
      storageKey,
      size: fileSize,
    },
  });

  return success({ id: file.id, path: file.path, size: fileSize, updated: true });
}
