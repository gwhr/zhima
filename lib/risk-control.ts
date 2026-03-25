import { db } from "@/lib/db";
import type { JobStatus } from "@prisma/client";

const ACTIVE_JOB_STATUSES: JobStatus[] = ["PENDING", "RUNNING"];

function normalizePositiveInt(
  value: number | null | undefined,
  fallback: number,
  max: number
) {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) {
    return fallback;
  }
  return Math.min(max, Math.floor(value!));
}

export function getQueueAttemptsFromRetryLimit(retryLimit: number): number {
  const normalizedRetryLimit = Math.max(0, Math.min(5, Math.floor(retryLimit)));
  // BullMQ attempts includes the first execution, so retry=2 => attempts=3.
  return normalizedRetryLimit + 1;
}

export async function resolveUserTaskConcurrencyLimit(
  userId: string,
  defaultLimit: number
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { taskConcurrencyLimitOverride: true },
  });

  const override = user?.taskConcurrencyLimitOverride ?? null;
  const normalizedDefault = normalizePositiveInt(defaultLimit, 1, 20);
  const effectiveLimit = normalizePositiveInt(override, normalizedDefault, 20);

  return {
    override,
    effectiveLimit,
  };
}

export async function ensureUserTaskConcurrencyAllowed(
  userId: string,
  defaultLimit: number
) {
  const { override, effectiveLimit } = await resolveUserTaskConcurrencyLimit(
    userId,
    defaultLimit
  );

  const activeCount = await db.taskJob.count({
    where: {
      status: { in: ACTIVE_JOB_STATUSES },
      workspace: {
        userId,
      },
    },
  });

  if (activeCount >= effectiveLimit) {
    throw new Error(
      `当前并发任务已达上限（${effectiveLimit}），请等待已有任务完成后重试。`
    );
  }

  return {
    override,
    effectiveLimit,
    activeCount,
  };
}
