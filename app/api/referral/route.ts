import { db } from "@/lib/db";
import { success } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import crypto from "crypto";

async function generateUniqueCode() {
  for (let i = 0; i < 5; i += 1) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const existing = await db.inviteCode.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return `${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`.toUpperCase();
}

async function getOrCreateInviteCode(userId: string) {
  let inviteCode = await db.inviteCode.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!inviteCode) {
    inviteCode = await db.inviteCode.create({
      data: {
        userId,
        code: await generateUniqueCode(),
      },
    });
  }

  return inviteCode;
}

function buildInviteUrl(origin: string, code: string) {
  return `${origin}/register?ref=${encodeURIComponent(code)}`;
}

function toPayload(inviteCode: Awaited<ReturnType<typeof getOrCreateInviteCode>>, origin: string) {
  return {
    id: inviteCode.id,
    code: inviteCode.code,
    usedCount: inviteCode.usedCount,
    rewardTotal: Number(inviteCode.rewardTotal),
    createdAt: inviteCode.createdAt,
    inviteUrl: buildInviteUrl(origin, inviteCode.code),
  };
}

export async function GET(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const inviteCode = await getOrCreateInviteCode(session!.user.id);
  const origin = new URL(req.url).origin;

  return success(toPayload(inviteCode, origin));
}

export async function POST(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const origin = new URL(req.url).origin;
  const url = new URL(req.url);
  const shouldRegenerate = url.searchParams.get("regenerate") === "1";

  let inviteCode = await getOrCreateInviteCode(session!.user.id);
  if (shouldRegenerate) {
    inviteCode = await db.inviteCode.update({
      where: { id: inviteCode.id },
      data: { code: await generateUniqueCode() },
    });
  }

  return success(toPayload(inviteCode, origin));
}
