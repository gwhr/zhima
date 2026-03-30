import { error, success } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { getUserTokenSummary } from "@/lib/ai/usage";

export async function GET() {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const summary = await getUserTokenSummary(session!.user.id);
    return success(summary);
  } catch (e) {
    console.error("Failed to load token summary:", e);
    return error("Token summary unavailable", 500);
  }
}
