import { error, success } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { releaseTokenReservation } from "@/lib/billing/token-wallet";
import { db } from "@/lib/db";
import { logAdminAudit } from "@/lib/admin-audit";

export async function POST(req: Request) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as
    | { reservationId?: string; taskJobId?: string; reason?: string }
    | null;
  if (!body) return error("请求参数无效", 400);

  const reservationId = String(body.reservationId || "").trim();
  const taskJobId = String(body.taskJobId || "").trim();
  const reason = String(body.reason || "").trim();
  if (!reservationId && !taskJobId) {
    return error("请提供 reservationId 或 taskJobId", 400);
  }

  const before = reservationId
    ? await db.tokenReservation.findUnique({ where: { id: reservationId } })
    : await db.tokenReservation.findUnique({ where: { taskJobId } });
  if (!before) return error("未找到对应冻结记录", 404);

  const result = await releaseTokenReservation({
    reservationId: reservationId || undefined,
    taskJobId: taskJobId || undefined,
    reason: reason || "Admin manual rollback",
    ledgerType: "ROLLBACK",
  });

  if (!result.released) {
    return error("该冻结记录已结算或已释放，无需回滚", 409);
  }

  const after = await db.tokenReservation.findUnique({
    where: { id: result.reservationId },
  });

  await logAdminAudit({
    adminUserId: session!.user.id,
    action: "billing.token_rollback",
    module: "billing",
    targetType: "TokenReservation",
    targetId: result.reservationId,
    summary: "管理员手动回滚冻结点数",
    before,
    after,
    metadata: {
      reason: reason || "Admin manual rollback",
      requestedReservationId: reservationId || null,
      requestedTaskJobId: taskJobId || null,
    },
    req,
  });

  return success({
    reservationId: result.reservationId,
    released: true,
  });
}
