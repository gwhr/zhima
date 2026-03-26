import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/storage/oss";
import { logAdminAudit } from "@/lib/admin-audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const { templateId } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  if (body.action !== "activate") {
    return error("不支持的操作", 400);
  }

  const target = await db.thesisTemplate.findUnique({ where: { id: templateId } });
  if (!target) return error("模板不存在", 404);

  const prevActive = await db.thesisTemplate.findFirst({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  await db.$transaction([
    db.thesisTemplate.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    }),
    db.thesisTemplate.update({
      where: { id: templateId },
      data: { isActive: true },
    }),
  ]);

  await logAdminAudit({
    adminUserId: session!.user.id,
    action: "template.activate",
    module: "templates",
    targetType: "ThesisTemplate",
    targetId: templateId,
    summary: `启用论文模板：${target.name}`,
    before: {
      activeTemplate: prevActive,
    },
    after: {
      activeTemplate: { id: target.id, name: target.name },
    },
    req,
  });

  return success({ id: templateId, isActive: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const { templateId } = await params;
  const target = await db.thesisTemplate.findUnique({ where: { id: templateId } });
  if (!target) return error("模板不存在", 404);
  if (target.isActive) {
    return error("当前启用模板不能删除，请先切换到其他模板", 400);
  }

  await db.thesisTemplate.delete({ where: { id: templateId } });
  await deleteFile(target.storageKey).catch(() => undefined);

  await logAdminAudit({
    adminUserId: session!.user.id,
    action: "template.delete",
    module: "templates",
    targetType: "ThesisTemplate",
    targetId: templateId,
    summary: `删除论文模板：${target.name}`,
    before: target,
    req,
  });

  return success({ id: templateId, deleted: true });
}
