import { db } from "@/lib/db";
import type { JobStatus, Prisma } from "@prisma/client";
import { hasUserRecharged as hasUserRechargedInternal } from "@/lib/user-entitlements";

type RuntimePreviewState = "queued" | "running" | "expired" | "completed";

interface RuntimePreviewPayload {
  mode: "runtime";
  state: RuntimePreviewState;
  queuePosition?: number;
  queueTotal?: number;
  sessionStartedAt?: string;
  sessionExpiresAt?: string;
  durationSeconds?: number;
  previewUrl?: string;
  updatedAt?: string;
}

interface PreviewJobRow {
  id: string;
  workspaceId: string;
  status: JobStatus;
  progress: number;
  createdAt: Date;
  result: Prisma.JsonValue | null;
}

export interface RuntimePreviewJobView {
  id: string;
  status: JobStatus;
  progress: number;
  stage: string | null;
  detail: string | null;
  queuePosition: number;
  queueTotal: number;
  sessionStartedAt: string | null;
  sessionExpiresAt: string | null;
  remainingSeconds: number;
  previewUrl: string | null;
  createdAt: string;
}

function readPositiveInt(value: string | undefined, fallback: number, min = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
}

const PREVIEW_RUNTIME_SECONDS = readPositiveInt(
  process.env.RUNTIME_PREVIEW_SECONDS,
  5 * 60,
  60
);
const PREVIEW_MAX_CONCURRENCY = readPositiveInt(
  process.env.RUNTIME_PREVIEW_MAX_CONCURRENCY,
  1,
  1
);
const FREE_PREVIEW_LIMIT = readPositiveInt(
  process.env.RUNTIME_PREVIEW_FREE_LIMIT,
  1,
  0
);

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toIsoString(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function readRuntimePayload(result: Prisma.JsonValue | null): RuntimePreviewPayload {
  const root = asObject(result);
  const runtime = asObject(root.runtimePreview);
  const stateValue = runtime.state;
  const state: RuntimePreviewState =
    stateValue === "queued" ||
    stateValue === "running" ||
    stateValue === "expired" ||
    stateValue === "completed"
      ? stateValue
      : "queued";

  return {
    mode: "runtime",
    state,
    queuePosition:
      typeof runtime.queuePosition === "number" && Number.isFinite(runtime.queuePosition)
        ? Math.max(0, Math.floor(runtime.queuePosition))
        : undefined,
    queueTotal:
      typeof runtime.queueTotal === "number" && Number.isFinite(runtime.queueTotal)
        ? Math.max(0, Math.floor(runtime.queueTotal))
        : undefined,
    sessionStartedAt: toIsoString(runtime.sessionStartedAt) ?? undefined,
    sessionExpiresAt: toIsoString(runtime.sessionExpiresAt) ?? undefined,
    durationSeconds:
      typeof runtime.durationSeconds === "number" && Number.isFinite(runtime.durationSeconds)
        ? Math.max(1, Math.floor(runtime.durationSeconds))
        : undefined,
    previewUrl:
      typeof runtime.previewUrl === "string" && runtime.previewUrl.trim()
        ? runtime.previewUrl.trim()
        : undefined,
    updatedAt: toIsoString(runtime.updatedAt) ?? undefined,
  };
}

function mergeRuntimePayload(
  result: Prisma.JsonValue | null,
  patch: Partial<RuntimePreviewPayload> & { stage?: string; detail?: string }
): Prisma.InputJsonValue {
  const root = asObject(result);
  const runtime = asObject(root.runtimePreview);

  const nextRuntime: Record<string, unknown> = {
    ...runtime,
    ...patch,
    mode: "runtime",
    updatedAt: new Date().toISOString(),
  };

  const nextRoot: Record<string, unknown> = {
    ...root,
    runtimePreview: nextRuntime,
  };

  if (typeof patch.stage === "string") nextRoot.stage = patch.stage;
  if (typeof patch.detail === "string") nextRoot.detail = patch.detail;

  return nextRoot as Prisma.InputJsonValue;
}

function mapPreviewJob(job: PreviewJobRow): RuntimePreviewJobView {
  const root = asObject(job.result);
  const payload = readRuntimePayload(job.result);
  const stage = typeof root.stage === "string" && root.stage.trim() ? root.stage : null;
  const detail = typeof root.detail === "string" && root.detail.trim() ? root.detail : null;

  const now = Date.now();
  const expiresAtMs = payload.sessionExpiresAt
    ? new Date(payload.sessionExpiresAt).getTime()
    : 0;
  const remainingSeconds =
    expiresAtMs > 0 ? Math.max(0, Math.ceil((expiresAtMs - now) / 1000)) : 0;

  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    stage,
    detail,
    queuePosition: payload.queuePosition ?? 0,
    queueTotal: payload.queueTotal ?? 0,
    sessionStartedAt: payload.sessionStartedAt ?? null,
    sessionExpiresAt: payload.sessionExpiresAt ?? null,
    remainingSeconds,
    previewUrl: payload.previewUrl ?? null,
    createdAt: job.createdAt.toISOString(),
  };
}

async function expireTimedOutSessions() {
  const runningJobs = await db.taskJob.findMany({
    where: { type: "PREVIEW", status: "RUNNING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      progress: true,
      createdAt: true,
      result: true,
    },
  });

  const now = Date.now();

  for (const job of runningJobs) {
    const payload = readRuntimePayload(job.result);
    const expiresAtMs = payload.sessionExpiresAt
      ? new Date(payload.sessionExpiresAt).getTime()
      : 0;
    if (expiresAtMs > now) continue;

    await db.taskJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        progress: 100,
        result: mergeRuntimePayload(job.result, {
          state: "expired",
          queuePosition: 0,
          queueTotal: 0,
          stage: "预览时段结束",
          detail: "本次运行预览已到时结束，可重新排队启动。",
        }),
      },
    });
  }
}

async function dispatchQueuedSessions() {
  const runningCount = await db.taskJob.count({
    where: { type: "PREVIEW", status: "RUNNING" },
  });
  const availableSlots = Math.max(0, PREVIEW_MAX_CONCURRENCY - runningCount);
  if (availableSlots <= 0) return;

  const pendingJobs = await db.taskJob.findMany({
    where: { type: "PREVIEW", status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: availableSlots,
    select: {
      id: true,
      workspaceId: true,
      status: true,
      progress: true,
      createdAt: true,
      result: true,
    },
  });
  if (pendingJobs.length === 0) return;

  const now = Date.now();
  for (const job of pendingJobs) {
    const startedAt = new Date(now).toISOString();
    const expiresAt = new Date(now + PREVIEW_RUNTIME_SECONDS * 1000).toISOString();

    await db.taskJob.update({
      where: { id: job.id },
      data: {
        status: "RUNNING",
        progress: 65,
        result: mergeRuntimePayload(job.result, {
          state: "running",
          queuePosition: 0,
          queueTotal: 0,
          sessionStartedAt: startedAt,
          sessionExpiresAt: expiresAt,
          durationSeconds: PREVIEW_RUNTIME_SECONDS,
          previewUrl: `/api/workspace/${job.workspaceId}/preview-build?runtime=1&jobId=${job.id}`,
          stage: "运行中",
          detail: "运行预览环境已就绪，可在窗口中查看效果。",
        }),
      },
    });
  }
}

async function refreshQueuePositions() {
  const pendingJobs = await db.taskJob.findMany({
    where: { type: "PREVIEW", status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      progress: true,
      createdAt: true,
      result: true,
    },
  });

  const queueTotal = pendingJobs.length;

  for (let index = 0; index < pendingJobs.length; index += 1) {
    const job = pendingJobs[index];
    const queuePosition = index + 1;

    await db.taskJob.update({
      where: { id: job.id },
      data: {
        progress: 20,
        result: mergeRuntimePayload(job.result, {
          state: "queued",
          queuePosition,
          queueTotal,
          durationSeconds: PREVIEW_RUNTIME_SECONDS,
          stage: "排队中",
          detail:
            queuePosition <= 1
              ? "正在等待空闲运行槽位，即将开始。"
              : `当前前方还有 ${queuePosition - 1} 人，请稍候。`,
        }),
      },
    });
  }
}

export async function syncRuntimePreviewQueue() {
  await expireTimedOutSessions();
  await dispatchQueuedSessions();
  await refreshQueuePositions();

  const [queueRunning, queuePending] = await Promise.all([
    db.taskJob.count({ where: { type: "PREVIEW", status: "RUNNING" } }),
    db.taskJob.count({ where: { type: "PREVIEW", status: "PENDING" } }),
  ]);

  return {
    queueRunning,
    queuePending,
    runtimeSeconds: PREVIEW_RUNTIME_SECONDS,
    maxConcurrent: PREVIEW_MAX_CONCURRENCY,
  };
}

export async function hasUserRecharged(userId: string) {
  return hasUserRechargedInternal(userId).catch((err) => {
    console.warn("hasUserRecharged failed in runtime-preview, fallback=false", err);
    return false;
  });
}

export async function countUserPreviewUsage(userId: string) {
  return db.taskJob.count({
    where: {
      type: "PREVIEW",
      status: { in: ["PENDING", "RUNNING", "COMPLETED"] },
      workspace: { userId },
    },
  });
}

export async function getWorkspacePreviewJob(workspaceId: string) {
  const job = await db.taskJob.findFirst({
    where: {
      workspaceId,
      type: "PREVIEW",
      status: { in: ["PENDING", "RUNNING", "COMPLETED"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      progress: true,
      createdAt: true,
      result: true,
    },
  });

  if (!job) return null;
  return mapPreviewJob(job);
}

export async function createPreviewQueueJob(workspaceId: string) {
  const job = await db.taskJob.create({
    data: {
      workspaceId,
      type: "PREVIEW",
      status: "PENDING",
      progress: 10,
      result: {
        stage: "排队中",
        detail: "已加入运行预览队列，正在等待空闲槽位。",
        runtimePreview: {
          mode: "runtime",
          state: "queued",
          durationSeconds: PREVIEW_RUNTIME_SECONDS,
          queuePosition: 0,
          queueTotal: 0,
          updatedAt: new Date().toISOString(),
        },
      } as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  return job.id;
}

export function getRuntimePreviewDefaults() {
  return {
    runtimeSeconds: PREVIEW_RUNTIME_SECONDS,
    maxConcurrent: PREVIEW_MAX_CONCURRENCY,
    freePreviewLimit: FREE_PREVIEW_LIMIT,
  };
}
