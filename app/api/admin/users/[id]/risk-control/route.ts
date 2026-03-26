import { error, success } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { logAdminAudit } from "@/lib/admin-audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as
    | {
        taskConcurrencyLimitOverride?: number | null | string;
      }
    | null;
  if (!body || !("taskConcurrencyLimitOverride" in body)) {
    return error("请求参数无效", 400);
  }

  const { id } = await params;
  const exists = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      taskConcurrencyLimitOverride: true,
    },
  });
  if (!exists) {
    return error("用户不存在", 404);
  }

  let overrideValue: number | null = null;
  const rawValue = body.taskConcurrencyLimitOverride;

  if (rawValue !== null && rawValue !== "" && rawValue !== undefined) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return error("并发上限必须为正整数，留空表示使用平台默认值", 400);
    }
    overrideValue = Math.min(20, Math.floor(parsed));
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      taskConcurrencyLimitOverride: overrideValue,
    },
    select: {
      id: true,
      taskConcurrencyLimitOverride: true,
    },
  });

  await logAdminAudit({
    adminUserId: session!.user.id,
    action: "user.risk_control.update_concurrency_override",
    module: "users",
    targetType: "User",
    targetId: id,
    summary: `设置用户并发覆盖上限为 ${
      overrideValue === null ? "平台默认" : String(overrideValue)
    }`,
    before: {
      taskConcurrencyLimitOverride: exists.taskConcurrencyLimitOverride,
    },
    after: {
      taskConcurrencyLimitOverride: updated.taskConcurrencyLimitOverride,
    },
    metadata: {
      targetUser: {
        id: exists.id,
        name: exists.name,
        email: exists.email,
        phone: exists.phone,
      },
    },
    req,
  });

  return success({
    user: updated,
  });
}
