import { error } from "@/lib/api-response";
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
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const resolved = await params;
  const key = joinKey(resolved.key ?? []);
  if (!key.startsWith("platform/public/")) {
    return error("文件不存在", 404);
  }

  try {
    const buffer = await downloadFile(key);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeByKey(key),
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return error("文件不存在", 404);
  }
}
