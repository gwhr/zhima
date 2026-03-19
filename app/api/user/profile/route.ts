import { db } from "@/lib/db";
import { success } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const user = await db.user.findUnique({
    where: { id: session!.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      createdAt: true,
    },
  });

  return success(user);
}

export async function PATCH(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { name, avatar } = await req.json();

  const user = await db.user.update({
    where: { id: session!.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(avatar !== undefined && { avatar }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
    },
  });

  return success(user);
}
