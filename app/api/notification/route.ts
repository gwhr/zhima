import { db } from "@/lib/db";
import { success } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const notifications = await db.notification.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return success(notifications);
}

export async function PATCH(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { ids } = await req.json();

  await db.notification.updateMany({
    where: {
      id: { in: ids },
      userId: session!.user.id,
    },
    data: { isRead: true },
  });

  return success({ message: "已标记已读" });
}
