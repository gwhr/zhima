import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const { status } = await req.json();

  const validStatuses = ["DRAFT", "GENERATING", "READY", "EXPIRED"];
  if (!validStatuses.includes(status)) {
    return error("无效状态", 400);
  }

  const workspace = await db.workspace.findUnique({ where: { id } });

  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  const updated = await db.workspace.update({
    where: { id },
    data: { status: status as "DRAFT" | "GENERATING" | "READY" | "EXPIRED" },
  });

  return success(updated);
}
