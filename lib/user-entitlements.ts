import { db } from "@/lib/db";

export async function hasUserRecharged(userId: string): Promise<boolean> {
  const count = await db.tokenLedger.count({
    where: {
      userId,
      type: "RECHARGE",
      deltaAvailablePoints: { gt: 0 },
    },
  });
  return count > 0;
}

