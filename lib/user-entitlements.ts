import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function hasUserRecharged(userId: string): Promise<boolean> {
  try {
    const count = await db.tokenLedger.count({
      where: {
        userId,
        type: "RECHARGE",
        deltaAvailablePoints: { gt: 0 },
      },
    });
    return count > 0;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2021" || err.code === "P2022")
    ) {
      console.warn(
        "Token ledger table/columns not ready, fallback hasUserRecharged=false:",
        err.code
      );
      return false;
    }
    // Recharge detection is non-critical. Any transient/mismatch error should
    // not block workspace APIs with 500 responses.
    console.warn(
      "hasUserRecharged failed, fallback hasUserRecharged=false:",
      err
    );
    return false;
  }
}
