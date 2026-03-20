import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";

type WorkspaceRequirements = Record<string, unknown> & {
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

  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  const runningCodeJob = await db.taskJob.findFirst({
    where: { workspaceId: id, type: "CODE_GEN", status: { in: ["PENDING", "RUNNING"] } },
    select: { id: true },
  });
  if (runningCodeJob) {
    return error("代码仍在生成中，暂不可确认预览", 409);
  }

  const codeFileCount = await db.workspaceFile.count({
    where: { workspaceId: id, type: "CODE" },
  });
  if (codeFileCount === 0) {
    return error("没有可预览的代码文件，请先生成代码", 400);
  }

  const requirements =
    workspace.requirements &&
    typeof workspace.requirements === "object" &&
    !Array.isArray(workspace.requirements)
      ? (workspace.requirements as WorkspaceRequirements)
      : ({} as WorkspaceRequirements);

  const merged: WorkspaceRequirements = {
    ...requirements,
    previewConfirmed: true,
    previewConfirmedAt: new Date().toISOString(),
  };

  await db.workspace.update({
    where: { id },
    data: { requirements: merged as Prisma.InputJsonValue },
  });

  return success({
    requirements: merged,
    message: "预览确认成功，现在可以生成论文",
  });
}
