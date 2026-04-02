import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import {
  getBillingPlanByType,
  getLegacyOrderPlanType,
  normalizePlanType,
} from "@/lib/billing/plans";
import { createPaymentSession } from "@/lib/payment/hupijiao";

export async function POST(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const { planType, planId, workspaceId } = await req.json();
    const normalizedPlanType = normalizePlanType(planId ?? planType);
    const appId = (process.env.HUPIJIAO_APPID || "").trim();
    const appSecret = (process.env.HUPIJIAO_SECRET || "").trim();
    const nextAuthUrl = (process.env.NEXTAUTH_URL || "").trim();

    if (!normalizedPlanType) {
      return error("无效点数包类型", 400);
    }

    const plan = await getBillingPlanByType(normalizedPlanType);
    if (!plan) {
      return error("该充值套餐暂未发布，请稍后再试", 400);
    }

    if (!appId || !appSecret) {
      return error("支付通道未配置完成，请先在后台补齐虎皮椒密钥", 400);
    }
    if (!nextAuthUrl.startsWith("http")) {
      return error("NEXTAUTH_URL 未配置为可访问地址，暂时无法发起支付", 400);
    }

    const order = await db.order.create({
      data: {
        userId: session!.user.id,
        workspaceId: workspaceId || null,
        // Legacy enum column is kept for compatibility.
        // Real dynamic plan id is encoded in paymentChannel.
        planType: getLegacyOrderPlanType(normalizedPlanType),
        paymentChannel: `hupijiao:${normalizedPlanType}`,
        amount: plan.price,
      },
    });

    const paymentSession = await createPaymentSession(
      order.id,
      plan.price,
      `智码 - ${plan.name} (${plan.points.toLocaleString()} points)`
    );

    const parsed = new URL(paymentSession.requestUrl);
    const missingFields = ["appid", "time", "hash"].filter(
      (key) => !parsed.searchParams.get(key)
    );
    if (missingFields.length > 0) {
      throw new Error(
        `支付请求参数缺失（${missingFields.join(", ")}），请检查支付通道配置`
      );
    }

    return success({
      orderId: order.id,
      paymentUrl: paymentSession.paymentUrl,
      qrCodeUrl: paymentSession.qrCodeUrl,
      requestUrl: paymentSession.requestUrl,
      points: plan.points,
      amountYuan: plan.priceYuan,
    });
  } catch (err) {
    console.error("Create payment order failed:", err);
    const message = err instanceof Error ? err.message : "创建支付订单失败";
    const status =
      message.includes("支付通道未配置") || message.includes("回调地址异常")
        ? 400
        : 500;
    return error(message, status);
  }
}
