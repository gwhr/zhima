import crypto from "crypto";

const APPID = process.env.HUPIJIAO_APPID || "";
const SECRET = process.env.HUPIJIAO_SECRET || "";
const NOTIFY_URL = process.env.NEXTAUTH_URL + "/api/payment/notify";
const RETURN_URL = process.env.NEXTAUTH_URL + "/dashboard";

function sign(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .filter((k) => params[k] && k !== "hash")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  return crypto.createHash("md5").update(sorted + SECRET).digest("hex");
}

export function createPaymentUrl(orderId: string, amount: number, title: string) {
  const params: Record<string, string> = {
    version: "1.1",
    appid: APPID,
    trade_order_id: orderId,
    total_fee: (amount / 100).toFixed(2),
    title,
    notify_url: NOTIFY_URL,
    return_url: RETURN_URL,
    nonce_str: crypto.randomBytes(16).toString("hex"),
  };

  params.hash = sign(params);

  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  return `https://api.xunhupay.com/payment/do.html?${query}`;
}

export function verifyNotify(params: Record<string, string>): boolean {
  const expected = sign(params);
  return expected === params.hash;
}
