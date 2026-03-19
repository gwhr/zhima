import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { getQuotaStatus } from "@/lib/ai/usage";

export async function GET(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) return error("缺少 workspaceId", 400);

  const quota = await getQuotaStatus(session!.user.id, workspaceId);
  if (!quota) return error("未找到额度信息", 404);

  return success(quota);
}
