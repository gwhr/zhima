import { requireAdmin } from "@/lib/auth-helpers";
import { success } from "@/lib/api-response";
import { db } from "@/lib/db";

function parseDays(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 7;
  return Math.min(parsed, 90);
}

export async function GET(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const days = parseDays(searchParams.get("days"));
  const startAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [periodLogs, periodTotals, allTotals] = await Promise.all([
    db.aiUsageLog.findMany({
      where: { createdAt: { gte: startAt } },
      select: {
        userId: true,
        model: true,
        taskType: true,
        inputTokens: true,
        outputTokens: true,
        costYuan: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.aiUsageLog.aggregate({
      where: { createdAt: { gte: startAt } },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        costYuan: true,
      },
      _count: {
        _all: true,
      },
    }),
    db.aiUsageLog.aggregate({
      _sum: {
        inputTokens: true,
        outputTokens: true,
        costYuan: true,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const byModel = new Map<
    string,
    { inputTokens: number; outputTokens: number; totalTokens: number; costYuan: number }
  >();
  const byTaskType = new Map<
    string,
    { inputTokens: number; outputTokens: number; totalTokens: number; costYuan: number }
  >();
  const byUser = new Map<
    string,
    { inputTokens: number; outputTokens: number; totalTokens: number; costYuan: number }
  >();
  const daily = new Map<
    string,
    { inputTokens: number; outputTokens: number; totalTokens: number; costYuan: number }
  >();

  for (const log of periodLogs) {
    const inputTokens = log.inputTokens ?? 0;
    const outputTokens = log.outputTokens ?? 0;
    const totalTokens = inputTokens + outputTokens;
    const costYuan = Number(log.costYuan ?? 0);
    const dayKey = log.createdAt.toISOString().slice(0, 10);

    const modelStat = byModel.get(log.model) ?? {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costYuan: 0,
    };
    modelStat.inputTokens += inputTokens;
    modelStat.outputTokens += outputTokens;
    modelStat.totalTokens += totalTokens;
    modelStat.costYuan += costYuan;
    byModel.set(log.model, modelStat);

    const taskStat = byTaskType.get(log.taskType) ?? {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costYuan: 0,
    };
    taskStat.inputTokens += inputTokens;
    taskStat.outputTokens += outputTokens;
    taskStat.totalTokens += totalTokens;
    taskStat.costYuan += costYuan;
    byTaskType.set(log.taskType, taskStat);

    const userStat = byUser.get(log.userId) ?? {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costYuan: 0,
    };
    userStat.inputTokens += inputTokens;
    userStat.outputTokens += outputTokens;
    userStat.totalTokens += totalTokens;
    userStat.costYuan += costYuan;
    byUser.set(log.userId, userStat);

    const dailyStat = daily.get(dayKey) ?? {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costYuan: 0,
    };
    dailyStat.inputTokens += inputTokens;
    dailyStat.outputTokens += outputTokens;
    dailyStat.totalTokens += totalTokens;
    dailyStat.costYuan += costYuan;
    daily.set(dayKey, dailyStat);
  }

  const userIds = Array.from(byUser.keys());
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      })
    : [];
  const userMap = new Map(users.map((user) => [user.id, user]));

  return success({
    periodDays: days,
    summary: {
      period: {
        inputTokens: periodTotals._sum.inputTokens ?? 0,
        outputTokens: periodTotals._sum.outputTokens ?? 0,
        totalTokens:
          (periodTotals._sum.inputTokens ?? 0) +
          (periodTotals._sum.outputTokens ?? 0),
        costYuan: Number(periodTotals._sum.costYuan ?? 0),
        logCount: periodTotals._count._all,
      },
      allTime: {
        inputTokens: allTotals._sum.inputTokens ?? 0,
        outputTokens: allTotals._sum.outputTokens ?? 0,
        totalTokens:
          (allTotals._sum.inputTokens ?? 0) +
          (allTotals._sum.outputTokens ?? 0),
        costYuan: Number(allTotals._sum.costYuan ?? 0),
        logCount: allTotals._count._all,
      },
    },
    byModel: Array.from(byModel.entries())
      .map(([model, stat]) => ({ model, ...stat }))
      .sort((a, b) => b.totalTokens - a.totalTokens),
    byTaskType: Array.from(byTaskType.entries())
      .map(([taskType, stat]) => ({ taskType, ...stat }))
      .sort((a, b) => b.totalTokens - a.totalTokens),
    byUser: Array.from(byUser.entries())
      .map(([userId, stat]) => ({
        userId,
        user: userMap.get(userId) ?? null,
        ...stat,
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 20),
    daily: Array.from(daily.entries())
      .map(([date, stat]) => ({ date, ...stat }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  });
}
