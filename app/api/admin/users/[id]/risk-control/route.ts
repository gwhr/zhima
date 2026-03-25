import { error, success } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireAdmin();
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
    select: { id: true },
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

  return success({
    user: updated,
  });
}
