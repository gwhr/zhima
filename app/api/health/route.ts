import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { success, error } from "@/lib/api-response";

export async function GET() {
  const checks: Record<string, string> = {
    status: "ok",
    db: "disconnected",
    redis: "disconnected",
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.db = "connected";
  } catch {
    checks.db = "error";
  }

  try {
    const pong = await redis.ping();
    checks.redis = pong === "PONG" ? "connected" : "error";
  } catch {
    checks.redis = "error";
  }

  const allHealthy = checks.db === "connected" && checks.redis === "connected";
  if (!allHealthy) {
    return error("Some services are unhealthy", 503);
  }

  return success(checks);
}
