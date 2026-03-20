/**
 * 阿里云 OSS 存储封装
 * 支持本地文件与 OSS 两种模式，默认自动探测。
 */

import fs from "fs/promises";
import path from "path";
import OSS from "ali-oss";

const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".storage");

type StorageProvider = "local" | "oss";

const OSS_REGION = process.env.OSS_REGION || "";
const OSS_ENDPOINT = process.env.OSS_ENDPOINT || "";
const OSS_BUCKET = process.env.OSS_BUCKET || "";
const OSS_ACCESS_KEY_ID =
  process.env.OSS_ACCESS_KEY_ID || process.env.OSS_ACCESS_KEY || "";
const OSS_ACCESS_KEY_SECRET =
  process.env.OSS_ACCESS_KEY_SECRET || process.env.OSS_SECRET_KEY || "";

let cachedClient: OSS | null = null;

function sanitizeStorageKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!normalized || normalized.includes("\0")) {
    throw new Error("Invalid storage key");
  }
  if (normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error("Path traversal detected");
  }
  return normalized;
}

function detectProvider(): StorageProvider {
  const configured = (process.env.STORAGE_PROVIDER || "").toLowerCase();
  if (configured === "local") return "local";
  if (configured === "oss") return "oss";

  if (
    OSS_REGION &&
    OSS_BUCKET &&
    OSS_ACCESS_KEY_ID &&
    OSS_ACCESS_KEY_SECRET
  ) {
    return "oss";
  }
  return "local";
}

function getOssClient(): OSS {
  if (cachedClient) return cachedClient;
  if (!OSS_REGION) throw new Error("Missing OSS_REGION");
  if (!OSS_BUCKET) throw new Error("Missing OSS_BUCKET");
  if (!OSS_ACCESS_KEY_ID) throw new Error("Missing OSS_ACCESS_KEY_ID");
  if (!OSS_ACCESS_KEY_SECRET) throw new Error("Missing OSS_ACCESS_KEY_SECRET");

  cachedClient = new OSS({
    region: OSS_REGION,
    endpoint: OSS_ENDPOINT || undefined,
    bucket: OSS_BUCKET,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
  });

  return cachedClient;
}

async function ensureLocalDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function resolveLocalPath(key: string) {
  const safeKey = sanitizeStorageKey(key);
  const filePath = path.join(LOCAL_STORAGE_DIR, safeKey);
  const resolved = path.resolve(filePath);
  const root = path.resolve(LOCAL_STORAGE_DIR);

  if (!resolved.startsWith(root)) {
    throw new Error("Illegal local storage path");
  }
  return resolved;
}

export async function uploadFile(
  key: string,
  content: string | Buffer
): Promise<string> {
  const safeKey = sanitizeStorageKey(key);
  const provider = detectProvider();

  if (provider === "oss") {
    const client = getOssClient();
    await client.put(
      safeKey,
      Buffer.isBuffer(content) ? content : Buffer.from(content, "utf-8")
    );
    return safeKey;
  }

  const filePath = resolveLocalPath(safeKey);
  await ensureLocalDir(filePath);
  await fs.writeFile(filePath, content);
  return safeKey;
}

export async function downloadFile(key: string): Promise<Buffer> {
  const safeKey = sanitizeStorageKey(key);
  const provider = detectProvider();

  if (provider === "oss") {
    const client = getOssClient();
    const result = await client.get(safeKey);
    const content = result.content;
    if (Buffer.isBuffer(content)) return content;
    if (typeof content === "string") return Buffer.from(content);
    if (content instanceof Uint8Array) return Buffer.from(content);
    throw new Error("Unexpected OSS object content type");
  }

  const filePath = resolveLocalPath(safeKey);
  return fs.readFile(filePath);
}

export async function deleteFile(key: string): Promise<void> {
  const safeKey = sanitizeStorageKey(key);
  const provider = detectProvider();

  if (provider === "oss") {
    const client = getOssClient();
    try {
      await client.delete(safeKey);
    } catch {
      // ignore missing object
    }
    return;
  }

  const filePath = resolveLocalPath(safeKey);
  await fs.unlink(filePath).catch(() => {});
}

export async function fileExists(key: string): Promise<boolean> {
  const safeKey = sanitizeStorageKey(key);
  const provider = detectProvider();

  if (provider === "oss") {
    const client = getOssClient();
    try {
      await client.head(safeKey);
      return true;
    } catch {
      return false;
    }
  }

  const filePath = resolveLocalPath(safeKey);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
