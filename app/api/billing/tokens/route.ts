import { error, success } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { getDefaultUserTokenBudget, getUserTokenSummary } from "@/lib/ai/usage";
import { Prisma } from "@prisma/client";

export async function GET() {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const summary = await getUserTokenSummary(session!.user.id);
    return success(summary);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P2021" || e.code === "P2022")
    ) {
      console.warn("Token tables not ready, fallback token summary is returned:", e.code);
    } else {
      console.error("Failed to load token summary, fallback token summary is returned:", e);
    }

    const fallbackBudget = getDefaultUserTokenBudget();
    return success({
      tokenBudget: fallbackBudget,
      tokenUsed: 0,
      tokenRemaining: fallbackBudget,
      tokenFrozen: 0,
      dailyUsedPoints: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheHitTokens: 0,
    });
  }
}
