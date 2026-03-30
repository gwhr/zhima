import { Prisma } from "@prisma/client";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { taskQueue } from "@/lib/queue";
import {
  ensureUserTaskConcurrencyAllowed,
  getQueueAttemptsFromRetryLimit,
} from "@/lib/risk-control";
import { getPlatformConfig } from "@/lib/system-config";
import { freezeTokenReservation } from "@/lib/billing/token-wallet";

type WorkspaceRequirements = {
  featureConfirmed?: boolean;
  difficultyAssessment?: unknown;
  previewConfirmed?: boolean;
  previewConfirmedAt?: string | null;
};

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

  const requirements =
    workspace.requirements &&
    typeof workspace.requirements === "object" &&
    !Array.isArray(workspace.requirements)
      ? (workspace.requirements as WorkspaceRequirements)
      : {};

  if (!requirements.featureConfirmed) {
    return error("请先确认功能范围并完成难度评估", 400);
  }
  if (!requirements.difficultyAssessment) {
    return error("缺少难度评估结果，请先重新确认功能", 400);
  }

  const platformConfig = await getPlatformConfig().catch(() => null);
  if (platformConfig && !platformConfig.enableCodeGeneration) {
    return error("平台当前已关闭代码生成功能，请联系管理员。", 403);
  }

  const existingJob = await db.taskJob.findFirst({
    where: {
      workspaceId: id,
      type: "CODE_GEN",
      status: { in: ["PENDING", "RUNNING"] },
    },
  });
  if (existingJob) {
    return error("代码正在生成中，请勿重复提交。", 409);
  }

  const existingCodeFile = await db.workspaceFile.findFirst({
    where: {
      workspaceId: id,
      type: "CODE",
    },
    select: { id: true },
  });
  if (existingCodeFile) {
    return error("当前工作空间代码已生成。请在 AI 对话中继续修改。", 409);
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

  await db.workspace.update({
    where: { id },
    data: {
      requirements: {
        ...requirements,
        previewConfirmed: false,
        previewConfirmedAt: null,
      } as Prisma.InputJsonValue,
    },
  });

  const reservePoints = platformConfig?.codeGenTokenReserve ?? 120_000;
  let jobId = "";
  let reservationId = "";

  try {
    const txResult = await db.$transaction(async (tx) => {
      const job = await tx.taskJob.create({
        data: {
          workspaceId: id,
          type: "CODE_GEN",
          status: "PENDING",
        },
      });

      const reservation = await freezeTokenReservation(
        {
          userId,
          workspaceId: id,
          taskJobId: job.id,
          source: "CODE_GEN",
          reservePoints,
          description: "Freeze points for code generation",
        },
        tx
      );

      return {
        jobId: job.id,
        reservationId: reservation.reservationId,
      };
    });

    jobId = txResult.jobId;
    reservationId = txResult.reservationId;
  } catch (quotaError) {
    return error(
      quotaError instanceof Error
        ? quotaError.message
        : "Token 余额不足，无法启动代码生成",
      402
    );
  }

  const attempts = getQueueAttemptsFromRetryLimit(
    platformConfig?.taskFailureRetryLimit ?? 2
  );

  await taskQueue.add(
    "code-gen",
    {
      jobId,
      workspaceId: id,
      userId,
      modelId: platformConfig?.codeGenModelId,
      singleTaskTokenHardLimit: platformConfig?.singleTaskTokenHardLimit,
      reservationId,
    },
    {
      attempts,
      backoff: { type: "fixed", delay: 3_000 },
    }
  );

  return success(
    {
      jobId,
      message: "代码生成任务已提交",
      riskControl: {
        retryLimit: Math.max(0, attempts - 1),
        singleTaskTokenHardLimit:
          platformConfig?.singleTaskTokenHardLimit ?? 240_000,
      },
      billing: {
        reservedPoints: reservePoints,
      },
    },
    202
  );
}
