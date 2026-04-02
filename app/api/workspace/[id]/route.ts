import { error, success } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/storage/oss";
import { getPlatformConfig } from "@/lib/system-config";
import { hasUserRecharged } from "@/lib/user-entitlements";

function toSafeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const workspace = await db.workspace.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          chatMessages: true,
          files: true,
          taskJobs: true,
        },
      },
    },
  });

  if (!workspace) {
    return error("工作空间不存在", 404);
  }

  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  const [platformConfig, recharged] = await Promise.all([
    getPlatformConfig().catch(() => null),
    hasUserRecharged(session!.user.id),
  ]);

  return success({
    workspace,
    platformPolicy: {
      freeWorkspaceLimit: platformConfig?.freeWorkspaceLimit ?? 3,
      requireRechargeForDownload: platformConfig?.requireRechargeForDownload ?? true,
      supportContactEnabled: platformConfig?.supportContactEnabled ?? false,
      supportContactTitle: toSafeString(platformConfig?.supportContactTitle, "一对一辅导（人工）"),
      supportContactDescription: toSafeString(
        platformConfig?.supportContactDescription,
        "可联系导师获取选题把关、部署排错、答辩材料梳理等一对一支持。"
      ),
      supportContactQrUrl: toSafeString(platformConfig?.supportContactQrUrl),
      hasRecharged: recharged,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const workspace = await db.workspace.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      files: {
        select: { storageKey: true },
      },
    },
  });

  if (!workspace) {
    return error("工作空间不存在", 404);
  }

  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }

  await Promise.all(
    workspace.files.map(async (file) => {
      try {
        await deleteFile(file.storageKey);
      } catch {
        // Ignore storage cleanup failures to avoid blocking DB deletion.
      }
    })
  );

  await db.workspace.delete({
    where: { id },
  });

  return success({ message: "已删除" });
}
