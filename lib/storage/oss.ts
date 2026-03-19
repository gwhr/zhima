/**
 * 阿里云 OSS 存储封装
 * 当前为本地文件模拟，上线时替换为真实 OSS SDK
 */

import fs from "fs/promises";
import path from "path";

const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".storage");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function uploadFile(
  key: string,
  content: string | Buffer
): Promise<string> {
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf-8");
  return key;
}

export async function downloadFile(key: string): Promise<string> {
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  return fs.readFile(filePath, "utf-8");
}

export async function deleteFile(key: string): Promise<void> {
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  await fs.unlink(filePath).catch(() => {});
}

export async function fileExists(key: string): Promise<boolean> {
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
