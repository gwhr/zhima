import { error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  return error("论文模板已改为平台统一配置，请联系管理员在后台上传。", 410);
}
