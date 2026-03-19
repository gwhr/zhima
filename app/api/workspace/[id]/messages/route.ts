import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(
  _req: Request,
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

  const messages = await db.chatMessage.findMany({
    where: { workspaceId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      metadata: true,
      createdAt: true,
    },
  });

  return success(messages);
}
