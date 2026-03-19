import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  const [users, total] = await Promise.all([
    db.user.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: { workspaces: true, orders: true },
        },
      },
    }),
    db.user.count(),
  ]);

  return success({ users, total, page, pageSize });
}
