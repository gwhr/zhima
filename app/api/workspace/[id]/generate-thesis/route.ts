import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { taskQueue } from "@/lib/queue";
import { ensureUserTokenQuota } from "@/lib/ai/usage";
import { getPlatformConfig } from "@/lib/system-config";

type WorkspaceRequirements = {
  previewConfirmed?: boolean;
};

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== session!.user.id) return error("无权限", 403);

  const runningCodeJob = await db.taskJob.findFirst({
    where: { workspaceId: id, type: "CODE_GEN", status: { in: ["PENDING", "RUNNING"] } },
  });
  if (runningCodeJob) {
    return error("代码仍在生成中，请先等待完成并进行预览确认", 409);
  }

  const codeFileCount = await db.workspaceFile.count({
    where: { workspaceId: id, type: "CODE" },
  });
  if (codeFileCount === 0) {
    return error("请先生成代码并完成预览后再生成论文", 400);
  }

  const requirements =
    workspace.requirements &&
    typeof workspace.requirements === "object" &&
    !Array.isArray(workspace.requirements)
      ? (workspace.requirements as WorkspaceRequirements)
      : {};
  if (!requirements.previewConfirmed) {
    return error("请先点击预览并确认无问题后，再生成论文", 400);
  }

  const platformConfig = await getPlatformConfig().catch(() => null);
  if (platformConfig && !platformConfig.enableThesisGeneration) {
    return error("平台当前已关闭论文生成功能，请联系管理员。", 403);
  }

  try {
    await ensureUserTokenQuota(
      session!.user.id,
      platformConfig?.thesisGenTokenReserve ?? 220_000,
      "论文生成"
    );
  } catch (quotaError) {
    return error(
      quotaError instanceof Error ? quotaError.message : "Token 额度不足",
      402
    );
  }

  const existingJob = await db.taskJob.findFirst({
    where: { workspaceId: id, type: "THESIS_GEN", status: { in: ["PENDING", "RUNNING"] } },
  });

  if (existingJob) return error("论文正在生成中", 409);

  const job = await db.taskJob.create({
    data: {
      workspaceId: id,
      type: "THESIS_GEN",
      status: "PENDING",
    },
  });

  await taskQueue.add("thesis-gen", {
    jobId: job.id,
    workspaceId: id,
    userId: session!.user.id,
    modelId: platformConfig?.thesisGenModelId,
  });

  return success({ jobId: job.id, message: "论文生成任务已提交" }, 202);
}
