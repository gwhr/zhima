import nodemailer from "nodemailer";
import { redis } from "@/lib/redis";

type EmailErrorCode = "RATE_LIMITED" | "CONFIG_ERROR" | "PROVIDER_ERROR";

type SendEmailResult =
  | { success: true; message: string }
  | { success: false; message: string; errorCode: EmailErrorCode };

type SendEmailOptions = {
  ip?: string | null;
};

const isDev = process.env.NODE_ENV !== "production";

const CODE_EXPIRE_SECONDS = readEnvInt("EMAIL_CODE_EXPIRE_SECONDS", 300);
const EMAIL_DAILY_LIMIT = readEnvInt("EMAIL_DAILY_LIMIT", 10);
const EMAIL_HOURLY_LIMIT = readEnvInt("EMAIL_HOURLY_LIMIT", 5);
const COOLDOWN_SECONDS = readEnvInt("EMAIL_COOLDOWN_SECONDS", 60);
const IP_MINUTE_LIMIT = readEnvInt("EMAIL_IP_MINUTE_LIMIT", 20);
const IP_DAILY_LIMIT = readEnvInt("EMAIL_IP_DAILY_LIMIT", 200);
const VERIFY_MAX_ATTEMPTS = readEnvInt("EMAIL_VERIFY_MAX_ATTEMPTS", 8);
const VERIFY_LOCK_SECONDS = readEnvInt("EMAIL_VERIFY_LOCK_SECONDS", 900);

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readEnvBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = raw.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getEmailMode(): "mock" | "real" {
  const mode = (process.env.EMAIL_MODE ?? "").trim().toLowerCase();
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

async function checkSendLimits(email: string, ip: string | null): Promise<SendEmailResult | null> {
  const cooldownKey = `email:cooldown:${email}`;
  const emailDailyKey = `email:daily:${email}`;
  const emailHourlyKey = `email:hourly:${email}`;

  const cooldownTtl = await redis.ttl(cooldownKey);
  if (cooldownTtl > 0) {
    return {
      success: false,
      errorCode: "RATE_LIMITED",
      message: `请求过于频繁，请 ${cooldownTtl} 秒后再试`,
    };
  }

  const [emailDailyCount, emailHourlyCount] = await Promise.all([
    getCount(emailDailyKey),
    getCount(emailHourlyKey),
  ]);

  if (emailDailyCount >= EMAIL_DAILY_LIMIT) {
    return {
      success: false,
      errorCode: "RATE_LIMITED",
      message: "该邮箱今日验证码发送次数已达上限",
    };
  }

  if (emailHourlyCount >= EMAIL_HOURLY_LIMIT) {
    return {
      success: false,
      errorCode: "RATE_LIMITED",
      message: "该邮箱本小时验证码发送次数已达上限",
    };
  }

  if (!ip) return null;

  const ipMinuteKey = `email:ip:minute:${ip}`;
  const ipDailyKey = `email:ip:daily:${ip}`;
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

function createTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number.parseInt(process.env.SMTP_PORT ?? "", 10) || 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const secure = readEnvBoolean("SMTP_SECURE", port === 465);

  if (!host || !user || !pass) {
    return { transporter: null as null, from: "" };
  }

  const from = process.env.EMAIL_FROM?.trim() || user;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return { transporter, from };
}

async function sendWithSmtp(email: string, code: string): Promise<SendEmailResult> {
  const { transporter, from } = createTransporter();
  if (!transporter || !from) {
    return {
      success: false,
      errorCode: "CONFIG_ERROR",
      message: "邮箱验证码通道未配置，请联系管理员",
    };
  }

  const subject = "【智码】邮箱验证码";
  const text = `你的验证码是 ${code}，5 分钟内有效。若非本人操作请忽略。`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h3 style="margin: 0 0 12px;">【智码】邮箱验证码</h3>
      <p style="margin: 0 0 8px;">你的验证码是：</p>
      <p style="margin: 0 0 12px; font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
      <p style="margin: 0;">5 分钟内有效。若非本人操作请忽略。</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
    });
    return { success: true, message: "验证码已发送到邮箱" };
  } catch (err) {
    console.error("Failed to send email code:", err);
    return {
      success: false,
      errorCode: "PROVIDER_ERROR",
      message: "邮箱服务异常，请稍后重试",
    };
  }
}

async function markSendCounters(email: string, ip: string | null, code: string) {
  const verifyKey = `email:verify:${email}`;
  const cooldownKey = `email:cooldown:${email}`;
  const emailDailyKey = `email:daily:${email}`;
  const emailHourlyKey = `email:hourly:${email}`;

  const pipeline = redis.pipeline();
  pipeline.set(verifyKey, code, "EX", CODE_EXPIRE_SECONDS);
  pipeline.set(cooldownKey, "1", "EX", COOLDOWN_SECONDS);
  pipeline.incr(emailDailyKey);
  pipeline.expire(emailDailyKey, 86400);
  pipeline.incr(emailHourlyKey);
  pipeline.expire(emailHourlyKey, 3600);

  if (ip) {
    const ipMinuteKey = `email:ip:minute:${ip}`;
    const ipDailyKey = `email:ip:daily:${ip}`;
    pipeline.incr(ipMinuteKey);
    pipeline.expire(ipMinuteKey, 60);
    pipeline.incr(ipDailyKey);
    pipeline.expire(ipDailyKey, 86400);
  }

  await pipeline.exec();
}

async function getVerifyLock(email: string): Promise<string | null> {
  const lockKey = `email:verify:lock:${email}`;
  const ttl = await redis.ttl(lockKey);
  if (ttl <= 0) return null;
  return `验证码输入错误次数过多，请 ${minutesLabel(ttl)} 后再试`;
}

async function recordVerifyFail(email: string): Promise<void> {
  const attemptKey = `email:verify:attempt:${email}`;
  const lockKey = `email:verify:lock:${email}`;

  const pipeline = redis.pipeline();
  pipeline.incr(attemptKey);
  pipeline.expire(attemptKey, VERIFY_LOCK_SECONDS);
  const result = await pipeline.exec();

  const currentCountRaw = result?.[0]?.[1];
  const currentCount =
    typeof currentCountRaw === "number" ? currentCountRaw : Number(currentCountRaw ?? 0);

  if (currentCount >= VERIFY_MAX_ATTEMPTS) {
    await redis.set(lockKey, "1", "EX", VERIFY_LOCK_SECONDS);
  }
}

async function clearVerifyFail(email: string): Promise<void> {
  const attemptKey = `email:verify:attempt:${email}`;
  const lockKey = `email:verify:lock:${email}`;
  await redis.del(attemptKey, lockKey);
}

export async function sendEmailVerificationCode(
  rawEmail: string,
  options: SendEmailOptions = {}
): Promise<SendEmailResult> {
  const email = normalizeEmail(rawEmail);
  const ip = normalizeIp(options.ip);

  const limited = await checkSendLimits(email, ip);
  if (limited) return limited;

  const code = generateCode();
  const mode = getEmailMode();

  if (mode === "mock") {
    console.log("\n============================");
    console.log(`[DEV EMAIL] email: ${email}`);
    console.log(`[DEV EMAIL] code : ${code}`);
    console.log("============================\n");
  } else {
    const providerResult = await sendWithSmtp(email, code);
    if (!providerResult.success) return providerResult;
  }

  await markSendCounters(email, ip, code);
  return { success: true, message: "验证码已发送到邮箱" };
}

export async function checkEmailCode(rawEmail: string, code: string): Promise<boolean> {
  const email = normalizeEmail(rawEmail);
  const lockMessage = await getVerifyLock(email);
  if (lockMessage) return false;

  const verifyKey = `email:verify:${email}`;
  const stored = await redis.get(verifyKey);
  const ok = !!stored && stored === code;

  if (!ok) {
    await recordVerifyFail(email);
    return false;
  }

  await clearVerifyFail(email);
  await redis.del(verifyKey);
  return true;
}
