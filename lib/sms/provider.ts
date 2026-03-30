import { redis } from "@/lib/redis";

type SmsErrorCode = "RATE_LIMITED" | "CONFIG_ERROR" | "PROVIDER_ERROR";

type SendSmsResult =
  | { success: true; message: string }
  | { success: false; message: string; errorCode: SmsErrorCode };

type SendSmsOptions = {
  ip?: string | null;
};

const isDev = process.env.NODE_ENV !== "production";

const CODE_EXPIRE_SECONDS = 300;
const PHONE_DAILY_LIMIT = readEnvInt("SMS_PHONE_DAILY_LIMIT", 10);
const PHONE_HOURLY_LIMIT = readEnvInt("SMS_PHONE_HOURLY_LIMIT", 5);
const COOLDOWN_SECONDS = readEnvInt("SMS_COOLDOWN_SECONDS", 60);
const IP_MINUTE_LIMIT = readEnvInt("SMS_IP_MINUTE_LIMIT", 20);
const IP_DAILY_LIMIT = readEnvInt("SMS_IP_DAILY_LIMIT", 200);
const VERIFY_MAX_ATTEMPTS = readEnvInt("SMS_VERIFY_MAX_ATTEMPTS", 8);
const VERIFY_LOCK_SECONDS = readEnvInt("SMS_VERIFY_LOCK_SECONDS", 900);

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeIp(ip?: string | null): string | null {
  if (!ip) return null;
  const value = ip.trim();
  if (!value) return null;
  return value.replace(/[^\w:.]/g, "_").slice(0, 80);
}

function getSmsMode(): "mock" | "real" {
  const mode = (process.env.SMS_MODE ?? "").trim().toLowerCase();
  if (mode === "mock" || mode === "real") return mode;
  return isDev ? "mock" : "real";
}

async function getCount(key: string): Promise<number> {
  const value = await redis.get(key);
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function minutesLabel(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} 分钟`;
}

async function checkSendLimits(phone: string, ip: string | null): Promise<SendSmsResult | null> {
  const cooldownKey = `sms:cooldown:${phone}`;
  const phoneDailyKey = `sms:phone:daily:${phone}`;
  const phoneHourlyKey = `sms:phone:hourly:${phone}`;

  const cooldownTtl = await redis.ttl(cooldownKey);
  if (cooldownTtl > 0) {
    return {
      success: false,
      errorCode: "RATE_LIMITED",
      message: `请求过于频繁，请 ${cooldownTtl} 秒后再试`,
    };
  }

  const [phoneDailyCount, phoneHourlyCount] = await Promise.all([
    getCount(phoneDailyKey),
    getCount(phoneHourlyKey),
  ]);

  if (phoneDailyCount >= PHONE_DAILY_LIMIT) {
    return {
      success: false,
      errorCode: "RATE_LIMITED",
      message: "该手机号今日验证码发送次数已达上限",
    };
  }

  if (phoneHourlyCount >= PHONE_HOURLY_LIMIT) {
    return {
      success: false,
      errorCode: "RATE_LIMITED",
      message: "该手机号本小时验证码发送次数已达上限",
    };
  }

  if (!ip) return null;

  const ipMinuteKey = `sms:ip:minute:${ip}`;
  const ipDailyKey = `sms:ip:daily:${ip}`;

  const [ipMinuteCount, ipDailyCount] = await Promise.all([
    getCount(ipMinuteKey),
    getCount(ipDailyKey),
  ]);

  if (ipMinuteCount >= IP_MINUTE_LIMIT) {
    return {
      success: false,
      errorCode: "RATE_LIMITED",
      message: "请求过于频繁，请稍后再试",
    };
  }

  if (ipDailyCount >= IP_DAILY_LIMIT) {
    return {
      success: false,
      errorCode: "RATE_LIMITED",
      message: "当前网络今日发送次数已达上限，请明天再试",
    };
  }

  return null;
}

async function sendWithSmsBao(phone: string, code: string): Promise<SendSmsResult> {
  const apiUser = process.env.SMSBAO_USER || process.env.SMS_API_USER || "";
  const apiKey = process.env.SMSBAO_API_KEY || process.env.SMS_API_KEY || "";

  if (!apiUser || !apiKey) {
    return {
      success: false,
      errorCode: "CONFIG_ERROR",
      message: "短信通道未配置，请联系管理员",
    };
  }

  const content = `【智码】您的验证码是${code}，5分钟内有效。`;
  const url = `https://api.smsbao.com/sms?u=${encodeURIComponent(apiUser)}&p=${encodeURIComponent(apiKey)}&m=${encodeURIComponent(phone)}&c=${encodeURIComponent(content)}`;

  try {
    const res = await fetch(url, { method: "GET" });
    const text = (await res.text()).trim();

    if (text !== "0") {
      return {
        success: false,
        errorCode: "PROVIDER_ERROR",
        message: `短信发送失败（渠道错误码：${text}）`,
      };
    }

    return { success: true, message: "验证码已发送" };
  } catch {
    return {
      success: false,
      errorCode: "PROVIDER_ERROR",
      message: "短信服务异常，请稍后重试",
    };
  }
}

async function markSendCounters(phone: string, ip: string | null, code: string) {
  const verifyKey = `sms:verify:${phone}`;
  const cooldownKey = `sms:cooldown:${phone}`;
  const phoneDailyKey = `sms:phone:daily:${phone}`;
  const phoneHourlyKey = `sms:phone:hourly:${phone}`;

  const pipeline = redis.pipeline();
  pipeline.set(verifyKey, code, "EX", CODE_EXPIRE_SECONDS);
  pipeline.set(cooldownKey, "1", "EX", COOLDOWN_SECONDS);
  pipeline.incr(phoneDailyKey);
  pipeline.expire(phoneDailyKey, 86400);
  pipeline.incr(phoneHourlyKey);
  pipeline.expire(phoneHourlyKey, 3600);

  if (ip) {
    const ipMinuteKey = `sms:ip:minute:${ip}`;
    const ipDailyKey = `sms:ip:daily:${ip}`;
    pipeline.incr(ipMinuteKey);
    pipeline.expire(ipMinuteKey, 60);
    pipeline.incr(ipDailyKey);
    pipeline.expire(ipDailyKey, 86400);
  }

  await pipeline.exec();
}

async function getVerifyLock(phone: string): Promise<string | null> {
  const lockKey = `sms:verify:lock:${phone}`;
  const ttl = await redis.ttl(lockKey);
  if (ttl <= 0) return null;
  return `验证码输入错误次数过多，请 ${minutesLabel(ttl)} 后再试`;
}

async function recordVerifyFail(phone: string): Promise<void> {
  const attemptKey = `sms:verify:attempt:${phone}`;
  const lockKey = `sms:verify:lock:${phone}`;

  const pipeline = redis.pipeline();
  pipeline.incr(attemptKey);
  pipeline.expire(attemptKey, VERIFY_LOCK_SECONDS);
  const result = await pipeline.exec();

  const currentCountRaw = result?.[0]?.[1];
  const currentCount = typeof currentCountRaw === "number" ? currentCountRaw : Number(currentCountRaw ?? 0);

  if (currentCount >= VERIFY_MAX_ATTEMPTS) {
    await redis.set(lockKey, "1", "EX", VERIFY_LOCK_SECONDS);
  }
}

async function clearVerifyFail(phone: string): Promise<void> {
  const attemptKey = `sms:verify:attempt:${phone}`;
  const lockKey = `sms:verify:lock:${phone}`;
  await redis.del(attemptKey, lockKey);
}

export async function sendVerificationCode(phone: string, options: SendSmsOptions = {}): Promise<SendSmsResult> {
  const ip = normalizeIp(options.ip);
  const limited = await checkSendLimits(phone, ip);
  if (limited) return limited;

  const code = generateCode();
  const mode = getSmsMode();

  if (mode === "mock") {
    console.log("\n============================");
    console.log(`[DEV SMS] phone: ${phone}`);
    console.log(`[DEV SMS] code : ${code}`);
    console.log("============================\n");
  } else {
    const providerResult = await sendWithSmsBao(phone, code);
    if (!providerResult.success) return providerResult;
  }

  await markSendCounters(phone, ip, code);
  return { success: true, message: "验证码已发送" };
}

/** 校验验证码并消费（删除），用于最终登录 */
export async function verifyCode(phone: string, code: string): Promise<boolean> {
  const lockMessage = await getVerifyLock(phone);
  if (lockMessage) return false;

  const verifyKey = `sms:verify:${phone}`;
  const stored = await redis.get(verifyKey);
  if (!stored || stored !== code) {
    await recordVerifyFail(phone);
    return false;
  }

  await redis.del(verifyKey);
  await clearVerifyFail(phone);
  return true;
}

/** 仅校验验证码，不消费，用于注册前检查 */
export async function checkCode(phone: string, code: string): Promise<boolean> {
  const lockMessage = await getVerifyLock(phone);
  if (lockMessage) return false;

  const verifyKey = `sms:verify:${phone}`;
  const stored = await redis.get(verifyKey);
  const ok = !!stored && stored === code;

  if (!ok) {
    await recordVerifyFail(phone);
    return false;
  }

  await clearVerifyFail(phone);
  return true;
}
