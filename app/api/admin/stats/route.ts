import { db } from "@/lib/db";
import { success } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const [userCount, workspaceCount, orderCount, revenue] = await Promise.all([
    db.user.count(),
    db.workspace.count(),
    db.order.count({ where: { status: "PAID" } }),
    db.order.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
  ]);

  return success({
    userCount,
    workspaceCount,
    paidOrderCount: orderCount,
    totalRevenue: Number(revenue._sum.amount || 0),
  });
}
