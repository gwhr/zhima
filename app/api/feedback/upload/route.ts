import { requireAuth } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { uploadFile } from "@/lib/storage/oss";
import {
  FEEDBACK_IMAGE_MAX_SIZE,
  feedbackImageKey,
  guessImageExtension,
  isAllowedImageType,
  toFeedbackImageUrl,
} from "@/lib/feedback";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const formData = await req.formData().catch(() => null);
  if (!formData) return error("上传参数无效", 400);

  const file = formData.get("file");
  if (!(file instanceof File)) return error("请选择图片文件", 400);

  if (!isAllowedImageType(file.type)) {
    return error("仅支持 JPG/PNG/WebP/GIF 格式", 400);
  }
  if (file.size <= 0 || file.size > FEEDBACK_IMAGE_MAX_SIZE) {
    return error("图片大小不能超过 2MB", 400);
  }

  const ext = guessImageExtension(file.type);
  const key = feedbackImageKey(session!.user.id, ext);

  const bytes = await file.arrayBuffer();
  await uploadFile(key, Buffer.from(bytes));

  return success({
    key,
    url: toFeedbackImageUrl(key),
    size: file.size,
    contentType: file.type,
  });
}
