import type { Prisma, TokenLedgerType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-helpers";
import { success } from "@/lib/api-response";
import { db } from "@/lib/db";

const TOKEN_LEDGER_TYPES = [
  "INIT_GRANT",
  "RECHARGE",
  "FREEZE",
  "SETTLE",
  "REFUND",
  "MANUAL_ADJUST",
  "ROLLBACK",
] as const;

function parseIntParam(raw: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const page = parseIntParam(searchParams.get("page"), 1, 10_000);
  const pageSize = parseIntParam(searchParams.get("pageSize"), 20, 100);
  const userId = searchParams.get("userId")?.trim() || "";
  const type = searchParams.get("type")?.trim().toUpperCase() || "";

  const where: Prisma.TokenLedgerWhereInput = {};
  if (userId) where.userId = userId;
  if (type && TOKEN_LEDGER_TYPES.includes(type as (typeof TOKEN_LEDGER_TYPES)[number])) {
    where.type = type as TokenLedgerType;
  }

  const [rows, total] = await Promise.all([
    db.tokenLedger.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        reservation: {
          select: {
            id: true,
            status: true,
            reservedPoints: true,
            settledPoints: true,
            source: true,
            taskJobId: true,
          },
        },
      },
    }),
    db.tokenLedger.count({ where }),
  ]);

  return success({
    page,
    pageSize,
    total,
    rows,
  });
}
