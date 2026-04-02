import crypto from "crypto";

export type HupiPaymentSession = {
  requestUrl: string;
  paymentUrl: string;
  qrCodeUrl: string | null;
  raw: Record<string, unknown> | null;
};

function getConfig() {
  const appid = (process.env.HUPIJIAO_APPID || "").trim();
  const secret = (process.env.HUPIJIAO_SECRET || "").trim();
  const nextAuthUrl = (process.env.NEXTAUTH_URL || "").trim().replace(/\/+$/, "");
  return {
    appid,
    secret,
    notifyUrl: `${nextAuthUrl}/api/payment/notify`,
    returnUrl: `${nextAuthUrl}/dashboard/billing`,
  };
}

function sign(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params)
    .filter((k) => params[k] && k !== "hash")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  return crypto.createHash("md5").update(sorted + secret).digest("hex");
}

function buildPaymentRequestUrl(orderId: string, amount: number, title: string) {
  const { appid, secret, notifyUrl, returnUrl } = getConfig();
  if (!appid || !secret) {
    throw new Error("支付通道未配置完成，请先在生产环境配置 HUPIJIAO_APPID 和 HUPIJIAO_SECRET");
  }
  if (!notifyUrl.startsWith("http")) {
    throw new Error("支付回调地址异常，请检查 NEXTAUTH_URL 配置");
  }

  const params: Record<string, string> = {
    version: "1.1",
    appid,
    trade_order_id: orderId,
    time: `${Math.floor(Date.now() / 1000)}`,
    total_fee: (amount / 100).toFixed(2),
    title,
    notify_url: notifyUrl,
    return_url: returnUrl,
    nonce_str: crypto.randomBytes(16).toString("hex"),
  };

  params.hash = sign(params, secret);

  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  return `https://api.xunhupay.com/payment/do.html?${query}`;
}

export function createPaymentUrl(orderId: string, amount: number, title: string) {
  return buildPaymentRequestUrl(orderId, amount, title);
}

export async function createPaymentSession(
  orderId: string,
  amount: number,
  title: string
): Promise<HupiPaymentSession> {
  const requestUrl = buildPaymentRequestUrl(orderId, amount, title);
  const response = await fetch(requestUrl, {
    method: "GET",
    cache: "no-store",
  });
  const rawText = await response.text();

  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!payload) {
    return {
      requestUrl,
      paymentUrl: requestUrl,
      qrCodeUrl: null,
      raw: null,
    };
  }

  const errcode = Number(payload.errcode ?? -1);
  if (!Number.isFinite(errcode) || errcode !== 0) {
    const errmsg =
      typeof payload.errmsg === "string" && payload.errmsg.trim()
        ? payload.errmsg.trim()
        : `支付通道返回错误码 ${String(payload.errcode ?? "UNKNOWN")}`;
    throw new Error(errmsg);
  }

  const paymentUrl =
    typeof payload.url === "string" && payload.url.startsWith("http")
      ? payload.url
      : requestUrl;
  const qrCodeUrl =
    typeof payload.url_qrcode === "string" && payload.url_qrcode.startsWith("http")
      ? payload.url_qrcode
      : null;

  return {
    requestUrl,
    paymentUrl,
    qrCodeUrl,
    raw: payload,
  };
}

export function verifyNotify(params: Record<string, string>): boolean {
  const { secret } = getConfig();
  if (!secret) return false;
  const expected = sign(params, secret);
  return expected === params.hash;
}
