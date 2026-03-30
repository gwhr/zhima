import { success } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

function parseLimit(raw: string | null) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 100);
}

export async function GET(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const limit = parseLimit(searchParams.get("limit"));

  const rows = await db.tokenLedger.findMany({
    where: {
      userId: session!.user.id,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      taskType: true,
      model: true,
      billedPoints: true,
      deltaAvailablePoints: true,
      deltaFrozenPoints: true,
      deltaUsedPoints: true,
      availableAfter: true,
      frozenAfter: true,
      usedAfter: true,
      inputTokens: true,
      outputTokens: true,
      cacheHitTokens: true,
      costYuan: true,
      billingMultiplier: true,
      pointRate: true,
      description: true,
      createdAt: true,
    },
  });

  return success(rows);
}
