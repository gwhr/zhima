import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/storage/oss";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { templateId } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  if (body.action !== "activate") {
    return error("不支持的操作", 400);
  }

  const target = await db.thesisTemplate.findUnique({ where: { id: templateId } });
  if (!target) return error("模板不存在", 404);

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

  return success({ id: templateId, isActive: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { templateId } = await params;
  const target = await db.thesisTemplate.findUnique({ where: { id: templateId } });
  if (!target) return error("模板不存在", 404);
  if (target.isActive) {
    return error("当前启用模板不能删除，请先切换到其他模板", 400);
  }

  await db.thesisTemplate.delete({ where: { id: templateId } });
  await deleteFile(target.storageKey).catch(() => undefined);

  return success({ id: templateId, deleted: true });
}
