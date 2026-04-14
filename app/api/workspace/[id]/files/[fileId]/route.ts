import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { downloadFile } from "@/lib/storage/oss";
import { getPlatformConfig } from "@/lib/system-config";
import { hasUserRecharged } from "@/lib/user-entitlements";

const DEFAULT_THESIS_PREVIEW_CHAR_LIMIT = 4000;

function getThesisPreviewCharLimit(): number {
  const parsed = Number.parseInt(process.env.THESIS_PREVIEW_CHAR_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_THESIS_PREVIEW_CHAR_LIMIT;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id, fileId } = await params;

  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace) return error("工作空间不存在", 404);
  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return error("无权限", 403);
  }
  const isAdmin = session!.user.role === "ADMIN";

  const file = await db.workspaceFile.findUnique({
    where: { id: fileId, workspaceId: id },
  });

  if (!file) return error("文件不存在", 404);

  let previewLimited = false;
  let previewNotice: string | null = null;
  let totalChars: number | null = null;

  // 论文预览对普通用户始终做“部分可见”，完整内容通过下载包获取。
  if (file.type === "THESIS" && !isAdmin) {
    const [platformConfig, recharged] = await Promise.all([
      getPlatformConfig().catch(() => null),
      hasUserRecharged(session!.user.id).catch((err) => {
        console.warn("hasUserRecharged failed in workspace file GET, fallback=false", err);
        return false;
      }),
    ]);

    const requireRechargeForDownload = platformConfig?.requireRechargeForDownload ?? true;
    previewLimited = true;
    previewNotice =
      requireRechargeForDownload && !recharged
        ? "当前仅展示论文部分预览。充值后可下载完整论文。"
        : "当前仅展示论文部分预览。请下载论文包查看完整内容。";
  }

  let content = "";
  try {
    const buf = await downloadFile(file.storageKey);
    if (file.path.endsWith(".docx")) {
      content = previewLimited
        ? "[Word 二进制文件，当前仅展示论文预览说明。请下载论文包查看完整文档。]"
        : "[二进制文件，请下载查看]";
    } else {
      const rawContent = buf.toString("utf-8");
      totalChars = rawContent.length;
      if (previewLimited) {
        const limit = getThesisPreviewCharLimit();
        const previewBody = rawContent.slice(0, limit);
        content = `${previewBody}\n\n[仅展示论文预览片段，完整内容请下载论文包查看]`;
      } else {
        content = rawContent;
      }
    }
  } catch {
    content = "[文件读取失败]";
  }

  return success({
    id: file.id,
    path: file.path,
    type: file.type,
    size: file.size,
    storageKey: file.storageKey,
    content,
    previewLimited,
    previewNotice,
    totalChars,
  });
}
