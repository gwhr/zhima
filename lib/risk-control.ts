import { db } from "@/lib/db";
import type { JobStatus } from "@prisma/client";

const ACTIVE_JOB_STATUSES: JobStatus[] = ["PENDING", "RUNNING"];

// 清理“排队/运行过久未更新”的僵尸任务，避免把用户并发额度永久占满。
const STALE_PENDING_MINUTES = 10;
const STALE_RUNNING_MINUTES = 120;

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

function getStaleBefore(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function cleanupStaleActiveJobsForUser(userId: string) {
  const stalePendingBefore = getStaleBefore(STALE_PENDING_MINUTES);
  const staleRunningBefore = getStaleBefore(STALE_RUNNING_MINUTES);

  const [pendingCleanup, runningCleanup] = await Promise.all([
    db.taskJob.updateMany({
      where: {
        status: "PENDING",
        updatedAt: { lt: stalePendingBefore },
        workspace: { userId },
      },
      data: {
        status: "FAILED",
        error: "任务排队超时，系统已自动释放并发额度，请重试。",
      },
    }),
    db.taskJob.updateMany({
      where: {
        status: "RUNNING",
        updatedAt: { lt: staleRunningBefore },
        workspace: { userId },
      },
      data: {
        status: "FAILED",
        error: "任务执行超时，系统已自动释放并发额度，请重试。",
      },
    }),
  ]);

  return {
    cleanedPending: pendingCleanup.count,
    cleanedRunning: runningCleanup.count,
  };
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

  await cleanupStaleActiveJobsForUser(userId);

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
