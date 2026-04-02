import { db } from "@/lib/db";
import { verifyNotify } from "@/lib/payment/hupijiao";
import { getBillingPlanByType, type PlanType } from "@/lib/billing/plans";
import { rechargeWallet } from "@/lib/billing/token-wallet";

export async function POST(req: Request) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  if (!verifyNotify(params)) {
    return new Response("fail", { status: 400 });
  }

  const orderId = params.trade_order_id;
  const tradeNo = params.transaction_id;

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return new Response("success");
  }

  if (order.status === "PAID") {
    return new Response("success");
  }
  if (order.status !== "PENDING") {
    return new Response("fail", { status: 400 });
  }

  const plan = await getBillingPlanByType(order.planType as PlanType, {
    includeUnpublished: true,
  });
  if (!plan) {
    return new Response("fail", { status: 400 });
  }

  await db.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        tradeNo,
        paymentChannel: "hupijiao",
        paidAt: new Date(),
      },
    });

    await rechargeWallet(
      {
        userId: updatedOrder.userId,
        points: plan.points,
        amountYuan: Number(updatedOrder.amount) / 100,
        description: `Recharge by order ${updatedOrder.id}`,
        metadata: {
          orderId: updatedOrder.id,
          planType: updatedOrder.planType,
          paymentChannel: "hupijiao",
          tradeNo,
        },
      },
      tx
    );
  });

  return new Response("success");
}
