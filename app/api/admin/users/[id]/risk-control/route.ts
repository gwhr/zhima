import { error, success } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { adjustWalletTotal } from "@/lib/billing/token-wallet";
import { logAdminAudit } from "@/lib/admin-audit";

type PatchBody = {
  taskConcurrencyLimitOverride?: number | null | string;
  tokenBudgetOverride?: number | null | string;
  walletTotalPoints?: number | null | string;
};

function parseOptionalPositiveInteger(value: unknown) {
  if (value === null || value === "" || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return Number.NaN;
  return Math.floor(parsed);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body) return error("请求参数无效", 400);

  const hasConcurrencyField = "taskConcurrencyLimitOverride" in body;
  const hasTokenBudgetField = "tokenBudgetOverride" in body;
  const hasWalletTotalField = "walletTotalPoints" in body;

  if (!hasConcurrencyField && !hasTokenBudgetField && !hasWalletTotalField) {
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
      tokenWallet: {
        select: {
          totalPoints: true,
          availablePoints: true,
          frozenPoints: true,
          usedPoints: true,
        },
      },
    },
  });

  if (!exists) return error("用户不存在", 404);

  const parsedConcurrency = hasConcurrencyField
    ? parseOptionalPositiveInteger(body.taskConcurrencyLimitOverride)
    : exists.taskConcurrencyLimitOverride;
  if (Number.isNaN(parsedConcurrency)) {
    return error("并发上限必须为正整数，留空表示使用平台默认值", 400);
  }
  const nextTaskConcurrencyLimitOverride =
    parsedConcurrency === null ? null : Math.min(20, parsedConcurrency);

  const parsedBudget = hasTokenBudgetField
    ? parseOptionalPositiveInteger(body.tokenBudgetOverride)
    : exists.tokenBudgetOverride;
  if (Number.isNaN(parsedBudget)) {
    return error("Token 总额度必须为正整数，留空表示使用平台默认值", 400);
  }
  const nextTokenBudgetOverride = parsedBudget === null ? null : parsedBudget;

  const parsedWalletTotal = hasWalletTotalField
    ? parseOptionalPositiveInteger(body.walletTotalPoints)
    : null;
  if (Number.isNaN(parsedWalletTotal)) {
    return error("钱包总点数必须为正整数", 400);
  }
  if (hasWalletTotalField && parsedWalletTotal === null) {
    return error("钱包总点数不支持留空，请输入明确数值", 400);
  }

  const updated = await db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: {
        taskConcurrencyLimitOverride: hasConcurrencyField
          ? nextTaskConcurrencyLimitOverride
          : undefined,
        tokenBudgetOverride: hasTokenBudgetField
          ? nextTokenBudgetOverride
          : undefined,
      },
      select: {
        id: true,
        taskConcurrencyLimitOverride: true,
        tokenBudgetOverride: true,
      },
    });

    let walletAfter = exists.tokenWallet
      ? {
          totalPoints: exists.tokenWallet.totalPoints,
          availablePoints: exists.tokenWallet.availablePoints,
          frozenPoints: exists.tokenWallet.frozenPoints,
          usedPoints: exists.tokenWallet.usedPoints,
        }
      : null;

    if (hasWalletTotalField && parsedWalletTotal !== null) {
      const wallet = await adjustWalletTotal(
        {
          userId: id,
          targetTotalPoints: parsedWalletTotal,
          description: "Admin adjusted user wallet total points",
          metadata: {
            adminUserId: session!.user.id,
            source: "admin:user-risk-control",
          },
        },
        tx
      );

      walletAfter = {
        totalPoints: wallet.totalPoints,
        availablePoints: wallet.availablePoints,
        frozenPoints: wallet.frozenPoints,
        usedPoints: wallet.usedPoints,
      };
    }

    return { user, walletAfter };
  });

  await logAdminAudit({
    adminUserId: session!.user.id,
    action: "user.risk_control.update",
    module: "users",
    targetType: "User",
    targetId: id,
    summary: "更新用户风控与额度配置",
    before: {
      taskConcurrencyLimitOverride: exists.taskConcurrencyLimitOverride,
      tokenBudgetOverride: exists.tokenBudgetOverride,
      wallet: exists.tokenWallet ?? null,
    },
    after: {
      taskConcurrencyLimitOverride: updated.user.taskConcurrencyLimitOverride,
      tokenBudgetOverride: updated.user.tokenBudgetOverride,
      wallet: updated.walletAfter,
    },
    metadata: {
      changedFields: {
        taskConcurrencyLimitOverride: hasConcurrencyField,
        tokenBudgetOverride: hasTokenBudgetField,
        walletTotalPoints: hasWalletTotalField,
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
    user: updated.user,
    wallet: updated.walletAfter,
  });
}
