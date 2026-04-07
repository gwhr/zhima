import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import {
  FEEDBACK_IMAGE_MAX_COUNT,
  toFeedbackImageUrl,
} from "@/lib/feedback";

type FeedbackBody = {
  content?: string;
  contact?: string;
  pagePath?: string;
  imageKeys?: string[];
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeImageKeys(value: unknown, userId: string): string[] {
  if (!Array.isArray(value)) return [];
  const keys = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  const uniqueKeys = Array.from(new Set(keys));
  if (uniqueKeys.length > FEEDBACK_IMAGE_MAX_COUNT) {
    throw new Error(`最多上传 ${FEEDBACK_IMAGE_MAX_COUNT} 张图片`);
  }

  for (const key of uniqueKeys) {
    if (!key.startsWith(`feedback/${userId}/`)) {
      throw new Error("图片标识无效，请重新上传图片");
    }
  }

  return uniqueKeys;
}

function toFeedbackPayload(item: {
  id: string;
  content: string;
  contact: string | null;
  pagePath: string | null;
  imageKeys: string[];
  status: string;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...item,
    imageUrls: item.imageKeys.map((key) => toFeedbackImageUrl(key)),
  };
}

export async function GET(req: Request) {
  try {
    const { session, error: authError } = await requireAuth();
    if (authError) return authError;

    const url = new URL(req.url);
    const page = parsePositiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      parsePositiveInt(url.searchParams.get("pageSize"), DEFAULT_PAGE_SIZE)
    );
    const skip = (page - 1) * pageSize;

    const where = { userId: session!.user.id };
    const [rows, total] = await Promise.all([
      db.userFeedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          content: true,
          contact: true,
          pagePath: true,
          imageKeys: true,
          status: true,
          adminNote: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.userFeedback.count({ where }),
    ]);

    return success({
      items: rows.map((item) => toFeedbackPayload(item)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    console.error("[api/feedback][GET] failed", err);
    return error("加载反馈记录失败，请稍后重试", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error: authError } = await requireAuth();
    if (authError) return authError;

    const body = (await req.json().catch(() => null)) as FeedbackBody | null;
    if (!body) return error("请求参数无效", 400);

    const content = normalizeText(body.content);
    const contact = normalizeText(body.contact);
    const pagePath = normalizeText(body.pagePath);

    if (content.length < 5) {
      return error("反馈内容至少 5 个字符", 400);
    }
    if (content.length > 3000) {
      return error("反馈内容不能超过 3000 个字符", 400);
    }
    if (contact.length > 100) {
      return error("联系方式不能超过 100 个字符", 400);
    }
    if (pagePath.length > 200) {
      return error("页面路径不能超过 200 个字符", 400);
    }

    let imageKeys: string[] = [];
    try {
      imageKeys = normalizeImageKeys(body.imageKeys, session!.user.id);
    } catch (validationError) {
      return error(
        validationError instanceof Error ? validationError.message : "图片参数无效",
        400
      );
    }

    const created = await db.userFeedback.create({
      data: {
        userId: session!.user.id,
        content,
        contact: contact || null,
        pagePath: pagePath || null,
        imageKeys,
        status: "OPEN",
      },
      select: {
        id: true,
        content: true,
        contact: true,
        pagePath: true,
        imageKeys: true,
        status: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return success(toFeedbackPayload(created), 201);
  } catch (err) {
    console.error("[api/feedback][POST] failed", err);
    return error("提交反馈失败，请稍后重试", 500);
  }
}
