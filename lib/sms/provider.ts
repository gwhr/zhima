import { redis } from "@/lib/redis";

const isDev = process.env.NODE_ENV !== "production";

function generateCode(): string {
  return Math.random().toString().slice(2, 8);
}

export async function sendVerificationCode(phone: string): Promise<{ success: boolean; message: string }> {
  const cooldownKey = `sms:cooldown:${phone}`;
  const dailyKey = `sms:daily:${phone}`;
  const verifyKey = `sms:verify:${phone}`;

  const cooldown = await redis.get(cooldownKey);
  if (cooldown) {
    return { success: false, message: "请等待60秒后再发送" };
  }

  const dailyCount = await redis.get(dailyKey);
  if (dailyCount && parseInt(dailyCount) >= 10) {
    return { success: false, message: "今日发送次数已达上限" };
  }

  const code = generateCode();

  if (isDev) {
    console.log(`\n============================`);
    console.log(`[DEV SMS] 手机号: ${phone}`);
    console.log(`[DEV SMS] 验证码: ${code}`);
    console.log(`============================\n`);
  } else {
    const apiKey = process.env.SMSBAO_API_KEY || "";
    const apiUser = process.env.SMSBAO_USER || "";
    const content = `【智码】您的验证码是${code}，5分钟内有效。`;
    const url = `https://api.smsbao.com/sms?u=${apiUser}&p=${apiKey}&m=${phone}&c=${encodeURIComponent(content)}`;

    try {
      const res = await fetch(url);
      const text = await res.text();
      if (text !== "0") {
        return { success: false, message: "短信发送失败，请稍后再试" };
      }
    } catch {
      return { success: false, message: "短信服务异常" };
    }
  }

  const pipeline = redis.pipeline();
  pipeline.set(verifyKey, code, "EX", 300);
  pipeline.set(cooldownKey, "1", "EX", 60);
  pipeline.incr(dailyKey);
  pipeline.expire(dailyKey, 86400);
  await pipeline.exec();

  return { success: true, message: "验证码已发送" };
}

/** 校验验证码并消费（删除），用于最终登录 */
export async function verifyCode(phone: string, code: string): Promise<boolean> {
  const verifyKey = `sms:verify:${phone}`;
  const stored = await redis.get(verifyKey);
  if (!stored || stored !== code) return false;
  await redis.del(verifyKey);
  return true;
}

/** 仅校验验证码，不消费，用于注册前检查 */
export async function checkCode(phone: string, code: string): Promise<boolean> {
  const verifyKey = `sms:verify:${phone}`;
  const stored = await redis.get(verifyKey);
  return !!stored && stored === code;
}
