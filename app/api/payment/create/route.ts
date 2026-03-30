import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { plans, type PlanType } from "@/lib/billing/plans";
import { createPaymentUrl } from "@/lib/payment/hupijiao";

export async function POST(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { planType, workspaceId } = await req.json();
  const normalizedPlanType = String(planType || "").toUpperCase() as PlanType;

  if (!normalizedPlanType || !plans[normalizedPlanType]) {
    return error("无效点数包类型", 400);
  }

  const plan = plans[normalizedPlanType];

  const order = await db.order.create({
    data: {
      userId: session!.user.id,
      workspaceId: workspaceId || null,
      planType: normalizedPlanType,
      amount: plan.price,
    },
  });

  const paymentUrl = createPaymentUrl(
    order.id,
    plan.price,
    `智码 - ${plan.name} (${plan.points.toLocaleString()} points)`
  );

  return success({
    orderId: order.id,
    paymentUrl,
    points: plan.points,
    amountYuan: plan.priceYuan,
  });
}
