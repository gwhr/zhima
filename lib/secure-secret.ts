import crypto from "crypto";

const ENC_PREFIX = "enc:v1:";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer | null {
  const seed =
    process.env.CONFIG_ENCRYPTION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "";
  if (!seed) return null;
  return crypto.createHash("sha256").update(seed).digest();
}

export function encryptSecret(plainText: string): string {
  const value = plainText.trim();
  if (!value) return "";

  const key = getEncryptionKey();
  if (!key) return value;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString("base64");
  return `${ENC_PREFIX}${payload}`;
}

export function decryptSecret(cipherText: string | undefined | null): string {
  const value = (cipherText || "").trim();
  if (!value) return "";
  if (!value.startsWith(ENC_PREFIX)) return value;

  const key = getEncryptionKey();
  if (!key) return "";

  try {
    const payload = Buffer.from(value.slice(ENC_PREFIX.length), "base64");
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

export function maskSecret(secret: string): string {
  const value = secret.trim();
  if (!value) return "未配置";
  if (value.length <= 8) return `${value[0]}***${value[value.length - 1]}`;
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}
