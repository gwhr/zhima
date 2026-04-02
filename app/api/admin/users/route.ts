import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { error, success } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { getPlatformConfig } from "@/lib/system-config";

function parsePagination(raw: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function isSchemaMismatchError(caughtError: unknown): boolean {
  return (
    caughtError instanceof Prisma.PrismaClientKnownRequestError &&
    (caughtError.code === "P2021" || caughtError.code === "P2022")
  );
}

async function fallbackUsersList(
  where: {
    OR?: Array<{
      email?: { contains: string; mode: "insensitive" };
      phone?: { contains: string; mode: "insensitive" };
      name?: { contains: string; mode: "insensitive" };
    }>;
  },
  page: number,
  pageSize: number,
  defaultUserTokenBudget: number,
  defaultUserTaskConcurrencyLimit: number
) {
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
        createdAt: true,
      },
    }),
    db.user.count({ where }),
  ]);

  return success({
    users: users.map((user) => ({
      ...user,
      tokenBudgetOverride: null,
      taskConcurrencyLimitOverride: null,
      tokenBudget: defaultUserTokenBudget,
      tokenUsed: 0,
      tokenRemaining: defaultUserTokenBudget,
      tokenFrozen: 0,
      tokenDailyUsed: 0,
      tokenDailyUsageDate: null,
      tokenWalletInitialized: false,
      inputTokens: 0,
      outputTokens: 0,
      cacheHitTokens: 0,
      totalCostYuan: 0,
      effectiveTaskConcurrencyLimit: defaultUserTaskConcurrencyLimit,
      _count: {
        workspaces: 0,
        orders: 0,
      },
    })),
    total,
    page,
    pageSize,
    degraded: true,
  });
}

export async function GET(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const page = parsePagination(searchParams.get("page"), 1, 10_000);
  const pageSize = parsePagination(searchParams.get("pageSize") ?? searchParams.get("limit"), 20, 100);
  const search = searchParams.get("search")?.trim() || "";

  let defaultUserTokenBudget = 500_000;
  let defaultUserTaskConcurrencyLimit = 1;
  try {
    const config = await getPlatformConfig();
    defaultUserTokenBudget = config.defaultUserTokenBudget;
    defaultUserTaskConcurrencyLimit = config.defaultUserTaskConcurrencyLimit;
  } catch {
    // Keep fallback values
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

  try {
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
  } catch (caughtError) {
    console.error("Admin users list failed, fallback to minimal mode:", caughtError);

    try {
      if (isSchemaMismatchError(caughtError)) {
        console.warn("Admin users API degraded due schema mismatch.");
      }
      return await fallbackUsersList(
        where,
        page,
        pageSize,
        defaultUserTokenBudget,
        defaultUserTaskConcurrencyLimit
      );
    } catch (fallbackError) {
      console.error("Admin users fallback also failed:", fallbackError);
      return error("加载用户列表失败，请稍后重试", 500);
    }
  }
}
