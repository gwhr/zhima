import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { plans, type PlanType } from "@/lib/billing/plans";
import { createPaymentUrl } from "@/lib/payment/hupijiao";

export async function POST(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { planType, workspaceId } = await req.json();

  if (!planType || !plans[planType as PlanType]) {
    return error("无效套餐类型", 400);
  }

  if (!workspaceId) {
    return error("缺少 workspaceId", 400);
  }

  const plan = plans[planType as PlanType];

  const order = await db.order.create({
    data: {
      userId: session!.user.id,
      workspaceId,
      planType: planType as PlanType,
      amount: plan.price,
    },
  });

  const paymentUrl = createPaymentUrl(
    order.id,
    plan.price,
    `智码 - ${plan.name}`
  );

  return success({ orderId: order.id, paymentUrl });
}
