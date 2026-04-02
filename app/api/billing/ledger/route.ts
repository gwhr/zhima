import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { success } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

function parseLimit(raw: string | null) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 100);
}

export async function GET(req: Request) {
  try {
    const { session, error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const limit = parseLimit(searchParams.get("limit"));

    const rows = await db.tokenLedger.findMany({
      where: { userId: session!.user.id },
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
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2021" || err.code === "P2022")
    ) {
      console.warn("Token ledger table/columns not ready, fallback to empty list:", err.code);
      return success([]);
    }
    console.error("Failed to query token ledger:", err);
    return Response.json(
      {
        success: false,
        error: "加载账单数据失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}
