import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { uploadFile } from "@/lib/storage/oss";
import {
  PLATFORM_ASSET_MAX_SIZE,
  platformAssetKey,
  guessPlatformAssetExtension,
  isAllowedPlatformAssetType,
  toPlatformAssetUrl,
} from "@/lib/platform-assets";

export const runtime = "nodejs";

function resolveScope(value: string | null): "support" | "homepage-step" {
  return value === "homepage-step" ? "homepage-step" : "support";
}

export async function POST(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const formData = await req.formData().catch(() => null);
  if (!formData) return error("上传参数无效", 400);

  const file = formData.get("file");
  if (!(file instanceof File)) return error("请选择图片文件", 400);

  if (!isAllowedPlatformAssetType(file.type)) {
    return error("仅支持 JPG/PNG/WebP/GIF 格式", 400);
  }
  if (file.size <= 0 || file.size > PLATFORM_ASSET_MAX_SIZE) {
    return error("图片大小不能超过 3MB", 400);
  }

  const scope = resolveScope(
    typeof formData.get("scope") === "string"
      ? String(formData.get("scope"))
      : null
  );
  const ext = guessPlatformAssetExtension(file.type);
  const key = platformAssetKey(scope, ext);
  const bytes = await file.arrayBuffer();

  await uploadFile(key, Buffer.from(bytes));

  return success({
    key,
    url: toPlatformAssetUrl(key),
    scope,
    size: file.size,
    contentType: file.type,
  });
}
