import { db } from "@/lib/db";
import { success } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { getPlatformConfig } from "@/lib/system-config";

function parsePagination(raw: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const page = parsePagination(searchParams.get("page"), 1, 10_000);
  const pageSize = parsePagination(
    searchParams.get("pageSize") || searchParams.get("limit"),
    20,
    100
  );
  const search = searchParams.get("search")?.trim() || "";

  let defaultUserTokenBudget = 500_000;
  let defaultUserTaskConcurrencyLimit = 1;
  try {
    const config = await getPlatformConfig();
    defaultUserTokenBudget = config.defaultUserTokenBudget;
    defaultUserTaskConcurrencyLimit = config.defaultUserTaskConcurrencyLimit;
  } catch {
    // Use fallback config.
  }

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        tokenBudgetOverride: true,
        taskConcurrencyLimitOverride: true,
        createdAt: true,
        tokenWallet: {
          select: {
            totalPoints: true,
            availablePoints: true,
            frozenPoints: true,
            usedPoints: true,
            dailyUsedPoints: true,
            dailyUsageDate: true,
          },
        },
        _count: {
          select: { workspaces: true, orders: true },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const userIds = users.map((item) => item.id);
  const usageRows =
    userIds.length > 0
      ? await db.aiUsageLog.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds } },
          _sum: {
            inputTokens: true,
            outputTokens: true,
            cacheHitTokens: true,
            costYuan: true,
          },
        })
      : [];

  const usageMap = new Map(
    usageRows.map((row) => [
      row.userId,
      {
        inputTokens: row._sum.inputTokens ?? 0,
        outputTokens: row._sum.outputTokens ?? 0,
        cacheHitTokens: row._sum.cacheHitTokens ?? 0,
        totalCostYuan: Number(row._sum.costYuan ?? 0),
      },
    ])
  );

  const enrichedUsers = users.map((user) => {
    const usage = usageMap.get(user.id);
    const wallet = user.tokenWallet;
    const fallbackBudget = user.tokenBudgetOverride ?? defaultUserTokenBudget;

    return {
      ...user,
      tokenBudget: wallet?.totalPoints ?? fallbackBudget,
      tokenUsed: wallet?.usedPoints ?? 0,
      tokenRemaining: wallet?.availablePoints ?? fallbackBudget,
      tokenFrozen: wallet?.frozenPoints ?? 0,
      tokenDailyUsed: wallet?.dailyUsedPoints ?? 0,
      tokenDailyUsageDate: wallet?.dailyUsageDate ?? null,
      tokenWalletInitialized: Boolean(wallet),
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      cacheHitTokens: usage?.cacheHitTokens ?? 0,
      totalCostYuan: usage?.totalCostYuan ?? 0,
      effectiveTaskConcurrencyLimit:
        user.taskConcurrencyLimitOverride ?? defaultUserTaskConcurrencyLimit,
    };
  });

  return success({
    users: enrichedUsers,
    total,
    page,
    pageSize,
  });
}
