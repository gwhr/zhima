import { db } from "@/lib/db";
import { success } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import crypto from "crypto";

export async function GET() {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  let inviteCode = await db.inviteCode.findFirst({
    where: { userId: session!.user.id },
  });

  if (!inviteCode) {
    inviteCode = await db.inviteCode.create({
      data: {
        userId: session!.user.id,
        code: crypto.randomBytes(4).toString("hex").toUpperCase(),
      },
    });
  }

  return success(inviteCode);
}
