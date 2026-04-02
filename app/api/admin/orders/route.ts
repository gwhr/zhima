import { db } from "@/lib/db";
import { success } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

function getOrderPlanId(order: { planType: string; paymentChannel: string | null }) {
  if (order.paymentChannel?.startsWith("hupijiao:")) {
    return order.paymentChannel.slice("hupijiao:".length);
  }
  return order.planType.toLowerCase();
}

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });

  return success(
    orders.map((order) => ({
      ...order,
      planId: getOrderPlanId(order),
    }))
  );
}
