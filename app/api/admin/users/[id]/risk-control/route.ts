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
        tokenBudgetOverride?: number | null | string;
      }
    | null;
  if (!body) {
    return error("请求参数无效", 400);
  }

  const hasConcurrencyField = "taskConcurrencyLimitOverride" in body;
  const hasTokenBudgetField = "tokenBudgetOverride" in body;
  if (!hasConcurrencyField && !hasTokenBudgetField) {
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
      tokenBudgetOverride: true,
      taskConcurrencyLimitOverride: true,
    },
  });
  if (!exists) {
    return error("用户不存在", 404);
  }

  let overrideValue = exists.taskConcurrencyLimitOverride;
  if (hasConcurrencyField) {
    overrideValue = null;
    const rawValue = body.taskConcurrencyLimitOverride;
    if (rawValue !== null && rawValue !== "" && rawValue !== undefined) {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return error("并发上限必须为正整数，留空表示使用平台默认值", 400);
      }
      overrideValue = Math.min(20, Math.floor(parsed));
    }
  }

  let tokenBudgetOverride = exists.tokenBudgetOverride;
  if (hasTokenBudgetField) {
    tokenBudgetOverride = null;
    const rawBudget = body.tokenBudgetOverride;
    if (rawBudget !== null && rawBudget !== "" && rawBudget !== undefined) {
      const parsed = Number(rawBudget);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return error("Token 总额度必须为正整数，留空表示使用平台默认值", 400);
      }
      tokenBudgetOverride = Math.floor(parsed);
    }
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      taskConcurrencyLimitOverride: overrideValue,
      tokenBudgetOverride,
    },
    select: {
      id: true,
      taskConcurrencyLimitOverride: true,
      tokenBudgetOverride: true,
    },
  });

  await logAdminAudit({
    adminUserId: session!.user.id,
    action: "user.risk_control.update",
    module: "users",
    targetType: "User",
    targetId: id,
    summary: "更新用户风控/额度覆盖配置",
    before: {
      taskConcurrencyLimitOverride: exists.taskConcurrencyLimitOverride,
      tokenBudgetOverride: exists.tokenBudgetOverride,
    },
    after: {
      taskConcurrencyLimitOverride: updated.taskConcurrencyLimitOverride,
      tokenBudgetOverride: updated.tokenBudgetOverride,
    },
    metadata: {
      changedFields: {
        taskConcurrencyLimitOverride: hasConcurrencyField,
        tokenBudgetOverride: hasTokenBudgetField,
      },
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
