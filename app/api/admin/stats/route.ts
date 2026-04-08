import { db } from "@/lib/db";
import { success } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const paidOrderWhere = {
    status: "PAID" as const,
    paidAt: { not: null },
  };

  const [
    userCount,
    newUserCountToday,
    workspaceCount,
    newWorkspaceCountToday,
    orderCount,
    revenue,
    runningTaskCount,
    failedTaskCountToday,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({
      where: {
        createdAt: { gte: today },
      },
    }),
    db.workspace.count(),
    db.workspace.count({
      where: {
        createdAt: { gte: today },
      },
    }),
    db.order.count({ where: paidOrderWhere }),
    db.order.aggregate({
      where: paidOrderWhere,
      _sum: { amount: true },
    }),
    db.taskJob.count({
      where: { status: { in: ["PENDING", "RUNNING"] } },
    }),
    db.taskJob.count({
      where: {
        status: "FAILED",
        createdAt: { gte: today },
      },
    }),
  ]);

  return success({
    userCount,
    newUserCountToday,
    workspaceCount,
    newWorkspaceCountToday,
    orderCount,
    revenue: Number(revenue._sum.amount || 0),
    runningTaskCount,
    failedTaskCountToday,
  });
}
