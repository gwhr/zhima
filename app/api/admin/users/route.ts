import { db } from "@/lib/db";
import { success } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { getPlatformConfig } from "@/lib/system-config";

export async function GET(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(
      100,
      Number.parseInt(
        searchParams.get("pageSize") || searchParams.get("limit") || "20",
        10
      )
    )
  );
  const search = searchParams.get("search")?.trim() || "";
  let tokenBudget = 500_000;
  let defaultUserTaskConcurrencyLimit = 1;
  try {
    const config = await getPlatformConfig();
    tokenBudget = config.defaultUserTokenBudget;
    defaultUserTaskConcurrencyLimit = config.defaultUserTaskConcurrencyLimit;
  } catch {
    // Fallback to default when config table is not initialized.
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
        _count: {
          select: { workspaces: true, orders: true },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const userIds = users.map((user) => user.id);
  const usageMap = new Map<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      totalCostYuan: number;
    }
  >();

  if (userIds.length > 0) {
    const usageRows = await db.aiUsageLog.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        costYuan: true,
      },
    });

    for (const row of usageRows) {
      usageMap.set(row.userId, {
        inputTokens: row._sum.inputTokens ?? 0,
        outputTokens: row._sum.outputTokens ?? 0,
        totalCostYuan: Number(row._sum.costYuan ?? 0),
      });
    }
  }

  const enrichedUsers = users.map((user) => {
    const usage = usageMap.get(user.id);
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;
    const tokenUsed = inputTokens + outputTokens;
    const effectiveTokenBudget =
      user.tokenBudgetOverride ?? tokenBudget;

    return {
      ...user,
      tokenBudget: effectiveTokenBudget,
      tokenUsed,
      tokenRemaining: Math.max(0, effectiveTokenBudget - tokenUsed),
      totalCostYuan: usage?.totalCostYuan ?? 0,
      effectiveTaskConcurrencyLimit:
        user.taskConcurrencyLimitOverride ?? defaultUserTaskConcurrencyLimit,
    };
  });

  return success({ users: enrichedUsers, total, page, pageSize });
}
