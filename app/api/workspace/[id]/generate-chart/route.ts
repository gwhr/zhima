import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { taskQueue } from "@/lib/queue";
import {
  ensureUserTaskConcurrencyAllowed,
  getQueueAttemptsFromRetryLimit,
} from "@/lib/risk-control";
import { getPlatformConfig } from "@/lib/system-config";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const userId = session!.user.id;

  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== userId) return error("无权限", 403);

  const platformConfig = await getPlatformConfig().catch(() => null);

  const existingJob = await db.taskJob.findFirst({
    where: {
      workspaceId: id,
      type: "CHART_RENDER",
      status: { in: ["PENDING", "RUNNING"] },
    },
  });
  if (existingJob) {
    return error("图表正在生成中，请勿重复提交。", 409);
  }

  try {
    await ensureUserTaskConcurrencyAllowed(
      userId,
      platformConfig?.defaultUserTaskConcurrencyLimit ?? 1
    );
  } catch (concurrencyError) {
    return error(
      concurrencyError instanceof Error
        ? concurrencyError.message
        : "当前并发任务已达上限，请稍后重试。",
      429
    );
  }

  const job = await db.taskJob.create({
    data: {
      workspaceId: id,
      type: "CHART_RENDER",
      status: "PENDING",
    },
  });

  const attempts = getQueueAttemptsFromRetryLimit(
    platformConfig?.taskFailureRetryLimit ?? 2
  );

  await taskQueue.add(
    "chart-render",
    {
      jobId: job.id,
      workspaceId: id,
      userId,
    },
    {
      attempts,
      backoff: { type: "fixed", delay: 3_000 },
    }
  );

  return success(
    {
      jobId: job.id,
      message: "图表生成任务已提交",
      riskControl: {
        retryLimit: Math.max(0, attempts - 1),
      },
    },
    202
  );
}
