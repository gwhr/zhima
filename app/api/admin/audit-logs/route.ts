import { requireAdmin } from "@/lib/auth-helpers";
import { success } from "@/lib/api-response";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(100, Number.parseInt(searchParams.get("pageSize") || "20", 10))
  );
  const search = searchParams.get("search")?.trim() || "";
  const module = searchParams.get("module")?.trim() || "";

  const where = {
    ...(module ? { module } : {}),
    ...(search
      ? {
          OR: [
            { action: { contains: search, mode: "insensitive" as const } },
            { module: { contains: search, mode: "insensitive" as const } },
            { summary: { contains: search, mode: "insensitive" as const } },
            {
              adminUser: {
                is: {
                  OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } },
                    { phone: { contains: search, mode: "insensitive" as const } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        adminUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    }),
    db.adminAuditLog.count({ where }),
  ]);

  return success({
    items,
    total,
    page,
    pageSize,
  });
}
