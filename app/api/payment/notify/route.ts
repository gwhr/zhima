import { db } from "@/lib/db";
import { verifyNotify } from "@/lib/payment/hupijiao";
import { plans } from "@/lib/billing/plans";
import type { PlanType } from "@prisma/client";

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

  if (!order || order.status !== "PENDING") {
    return new Response("success");
  }

  const plan = plans[order.planType as keyof typeof plans];

  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        tradeNo,
        paymentChannel: "hupijiao",
        paidAt: new Date(),
      },
    }),
    db.userQuota.upsert({
      where: {
        userId_workspaceId: {
          userId: order.userId,
          workspaceId: order.workspaceId!,
        },
      },
      create: {
        userId: order.userId,
        workspaceId: order.workspaceId!,
        planType: order.planType as PlanType,
        opusBudget: plan.opusBudget,
        modifyLimit: plan.modifyLimit,
        previewLimit: plan.previewLimit,
      },
      update: {
        planType: order.planType as PlanType,
        opusBudget: { increment: plan.opusBudget },
        modifyLimit: { increment: plan.modifyLimit },
        previewLimit: { increment: plan.previewLimit },
      },
    }),
    db.workspace.update({
      where: { id: order.workspaceId! },
      data: { status: "READY" },
    }),
  ]);

  return new Response("success");
}
