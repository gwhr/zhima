import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  countUserPreviewUsage,
  createPreviewQueueJob,
  getRuntimePreviewDefaults,
  getWorkspacePreviewJob,
  hasUserRecharged,
  syncRuntimePreviewQueue,
} from "@/lib/runtime-preview";

function buildBlockedReason(params: {
  hasCodeFiles: boolean;
  hasRecharge: boolean;
  freeTrialRemaining: number | null;
}) {
  if (!params.hasCodeFiles) {
    return "请先生成项目代码，再启动运行预览。";
  }
  if (!params.hasRecharge && (params.freeTrialRemaining ?? 0) <= 0) {
    return "资源紧张：未充值账号仅提供一次运行预览，充值后可继续排队。";
  }
  return null;
}

async function buildRuntimeStatus(userId: string, workspaceId: string) {
  const hasCodeFiles =
    (await db.workspaceFile.count({
      where: {
        workspaceId,
        type: "CODE",
      },
    })) > 0;

  const [queue, hasRecharge, freeTrialUsed, currentJob] = await Promise.all([
    syncRuntimePreviewQueue(),
    hasUserRecharged(userId),
    countUserPreviewUsage(userId),
    getWorkspacePreviewJob(workspaceId),
  ]);

  const defaults = getRuntimePreviewDefaults();
  const freeTrialLimit = hasRecharge ? null : defaults.freePreviewLimit;
  const freeTrialRemaining =
    freeTrialLimit === null ? null : Math.max(0, freeTrialLimit - freeTrialUsed);

  const blockedReason = buildBlockedReason({
    hasCodeFiles,
    hasRecharge,
    freeTrialRemaining,
  });

  return {
    runtimeSeconds: queue.runtimeSeconds,
    maxConcurrent: queue.maxConcurrent,
    queuePending: queue.queuePending,
    queueRunning: queue.queueRunning,
    hasCodeFiles,
    hasRecharge,
    freeTrialLimit,
    freeTrialUsed,
    freeTrialRemaining,
    canStart: !blockedReason,
    blockedReason,
    currentJob,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const userId = session!.user.id;

  const workspace = await db.workspace.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== userId && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  const runtimeStatus = await buildRuntimeStatus(workspace.userId, id);
  return success(runtimeStatus);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const userId = session!.user.id;

  const workspace = await db.workspace.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== userId && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  const runtimeStatus = await buildRuntimeStatus(workspace.userId, id);
  const activeJob =
    runtimeStatus.currentJob &&
    (runtimeStatus.currentJob.status === "PENDING" ||
      runtimeStatus.currentJob.status === "RUNNING")
      ? runtimeStatus.currentJob
      : null;

  if (activeJob) {
    return success(
      {
        ...runtimeStatus,
        accepted: true,
        message: "当前已有运行预览任务，无需重复提交。",
      },
      202
    );
  }

  if (!runtimeStatus.canStart) {
    return error(runtimeStatus.blockedReason ?? "当前不可启动运行预览", 403);
  }

  await createPreviewQueueJob(id);
  const nextStatus = await buildRuntimeStatus(workspace.userId, id);

  return success(
    {
      ...nextStatus,
      accepted: true,
      message:
        nextStatus.currentJob?.status === "RUNNING"
          ? "运行预览已启动。"
          : "已加入运行预览队列，请稍候。",
    },
    202
  );
}

