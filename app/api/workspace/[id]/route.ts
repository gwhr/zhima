import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { deleteFile } from "@/lib/storage/oss";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const workspace = await db.workspace.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          chatMessages: true,
          files: true,
          taskJobs: true,
        },
      },
    },
  });

  if (!workspace) {
    return error("工作空间不存在", 404);
  }

  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  return success(workspace);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const workspace = await db.workspace.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      files: {
        select: { storageKey: true },
      },
    },
  });

  if (!workspace) {
    return error("工作空间不存在", 404);
  }

  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  await Promise.all(
    workspace.files.map(async (file) => {
      try {
        await deleteFile(file.storageKey);
      } catch {
        // Ignore storage cleanup failures to avoid blocking DB deletion.
      }
    })
  );

  await db.workspace.delete({
    where: { id },
  });

  return success({ message: "已删除" });
}
