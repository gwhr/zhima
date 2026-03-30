import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { db } from "@/lib/db";
import { logAdminAudit } from "@/lib/admin-audit";
import { toFeedbackImageUrl } from "@/lib/feedback";
import type { FeedbackStatus, Prisma } from "@prisma/client";

const ALLOWED_STATUS: FeedbackStatus[] = ["OPEN", "RESOLVED"];

function normalizeStatus(value: string | null): FeedbackStatus | null {
  if (!value) return null;
  const upper = value.toUpperCase() as FeedbackStatus;
  return ALLOWED_STATUS.includes(upper) ? upper : null;
}

function toPayload(item: {
  id: string;
  userId: string;
  content: string;
  contact: string | null;
  pagePath: string | null;
  imageKeys: string[];
  status: FeedbackStatus;
  adminNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
}) {
  return {
    ...item,
    imageUrls: item.imageKeys.map((key) => toFeedbackImageUrl(key)),
  };
}

export async function GET(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(50, Number.parseInt(searchParams.get("pageSize") || "20", 10))
  );
  const keyword = searchParams.get("keyword")?.trim() || "";
  const status = normalizeStatus(searchParams.get("status"));

  const where: Prisma.UserFeedbackWhereInput = {};
  if (status) where.status = status;
  if (keyword) {
    where.OR = [
      { content: { contains: keyword, mode: "insensitive" } },
      { contact: { contains: keyword, mode: "insensitive" } },
      { pagePath: { contains: keyword, mode: "insensitive" } },
      { user: { name: { contains: keyword, mode: "insensitive" } } },
      { user: { email: { contains: keyword, mode: "insensitive" } } },
      { user: { phone: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.userFeedback.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.userFeedback.count({ where }),
  ]);

  return success({
    total,
    page,
    pageSize,
    items: rows.map((row) => toPayload(row)),
  });
}

export async function PATCH(req: Request) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as
    | { id?: string; status?: FeedbackStatus; adminNote?: string }
    | null;
  if (!body?.id) return error("反馈 ID 不能为空", 400);

  const status = normalizeStatus(body.status ?? null);
  if (!status) return error("状态无效", 400);

  const adminNote =
    typeof body.adminNote === "string" ? body.adminNote.trim() : "";
  if (adminNote.length > 2000) {
    return error("管理员备注不能超过 2000 个字符", 400);
  }

  const existing = await db.userFeedback.findUnique({
    where: { id: body.id },
    select: {
      id: true,
      status: true,
      adminNote: true,
      resolvedAt: true,
      resolvedById: true,
    },
  });
  if (!existing) return error("反馈不存在", 404);

  const updated = await db.userFeedback.update({
    where: { id: body.id },
    data: {
      status,
      adminNote: adminNote || null,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
      resolvedById: status === "RESOLVED" ? session!.user.id : null,
    },
  });

  await logAdminAudit({
    adminUserId: session!.user.id,
    action: "feedback.update",
    module: "feedback",
    targetType: "UserFeedback",
    targetId: body.id,
    summary: `更新反馈状态为 ${status}`,
    before: existing,
    after: {
      id: updated.id,
      status: updated.status,
      adminNote: updated.adminNote,
      resolvedAt: updated.resolvedAt,
      resolvedById: updated.resolvedById,
    },
    req,
  });

  return success({
    id: updated.id,
    status: updated.status,
    adminNote: updated.adminNote,
    resolvedAt: updated.resolvedAt,
  });
}
