import { db } from "@/lib/db";
import { verifyNotify } from "@/lib/payment/hupijiao";
import { getBillingPlanByType } from "@/lib/billing/plans";
import { rechargeWallet } from "@/lib/billing/token-wallet";

function parsePlanIdFromOrder(order: {
  planType: string;
  paymentChannel: string | null;
}): string {
  const channel = order.paymentChannel || "";
  if (channel.startsWith("hupijiao:")) {
    return channel.slice("hupijiao:".length);
  }
  return String(order.planType || "").toLowerCase();
}

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

  const planId = parsePlanIdFromOrder(order);
  const plan = await getBillingPlanByType(planId, {
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
        paymentChannel: `hupijiao:${plan.id}`,
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
          planType: plan.id,
          legacyPlanType: updatedOrder.planType,
          paymentChannel: updatedOrder.paymentChannel,
          tradeNo,
        },
      },
      tx
    );
  });

  return new Response("success");
}
