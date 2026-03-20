import { success } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { getUserTokenSummary } from "@/lib/ai/usage";

export async function GET() {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const summary = await getUserTokenSummary(session!.user.id);
  return success(summary);
}

