import { requireAuth } from "@/lib/auth-helpers";
import { error } from "@/lib/api-response";
import { db } from "@/lib/db";
import { downloadFile } from "@/lib/storage/oss";

export const runtime = "nodejs";

function joinKey(segments: string[]): string {
  return segments.map((part) => decodeURIComponent(part)).join("/");
}

function mimeByKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const resolved = await params;
  const key = joinKey(resolved.key ?? []);
  if (!key.startsWith("feedback/")) {
    return error("文件不存在", 404);
  }

  const isAdmin = session!.user.role === "ADMIN";
  const feedback = await db.userFeedback.findFirst({
    where: isAdmin
      ? { imageKeys: { has: key } }
      : { userId: session!.user.id, imageKeys: { has: key } },
    select: { id: true },
  });

  if (!feedback) {
    return error("无权访问该图片", 403);
  }

  try {
    const buffer = await downloadFile(key);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeByKey(key),
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return error("文件不存在", 404);
  }
}
