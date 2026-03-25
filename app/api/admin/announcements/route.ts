import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { db } from "@/lib/db";
import type { AnnouncementLevel } from "@prisma/client";

const allowedLevels: AnnouncementLevel[] = ["INFO", "WARNING", "MAINTENANCE"];

export async function GET(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get("limit") || "50", 10))
  );

  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return success(announcements);
}

export async function POST(req: Request) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as
    | {
        title?: string;
        content?: string;
        level?: AnnouncementLevel;
        userId?: string;
      }
    | null;
  if (!body) return error("请求参数无效", 400);

  const title = body.title?.trim();
  const content = body.content?.trim();
  const level = body.level && allowedLevels.includes(body.level) ? body.level : "INFO";
  if (!title) return error("标题不能为空", 400);
  if (!content) return error("内容不能为空", 400);

  let targetUserIds: string[] = [];
  if (body.userId?.trim()) {
    const user = await db.user.findUnique({ where: { id: body.userId.trim() } });
    if (!user) return error("目标用户不存在", 404);
    targetUserIds = [user.id];
  } else {
    const users = await db.user.findMany({ select: { id: true } });
    targetUserIds = users.map((user) => user.id);
  }

  const now = new Date();
  const announcement = await db.announcement.create({
    data: {
      title,
      content,
      level,
      isPublished: true,
      createdById: session!.user.id,
    },
  });

  if (targetUserIds.length > 0) {
    await db.notification.createMany({
      data: targetUserIds.map((userId) => ({
        userId,
        type: "SYSTEM",
        title,
        content,
        createdAt: now,
      })),
    });
  }

  return success({
    announcementId: announcement.id,
    targetCount: targetUserIds.length,
  });
}
