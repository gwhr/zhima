import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { taskQueue } from "@/lib/queue";

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
  });

  return success({ jobId: job.id, message: "论文生成任务已提交" }, 202);
}
