import { requireAdmin } from "@/lib/auth-helpers";
import { success } from "@/lib/api-response";
import { db } from "@/lib/db";
import type { Prisma, WorkspaceStatus } from "@prisma/client";

function parsePage(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export async function GET(req: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const page = parsePage(searchParams.get("page"), 1);
  const pageSize = Math.min(
    100,
    Math.max(
      1,
      parsePage(searchParams.get("pageSize") ?? searchParams.get("limit"), 20)
    )
  );
  const search = searchParams.get("search")?.trim() || "";
  const statusParam = searchParams.get("status");

  const where: Prisma.WorkspaceWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { topic: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (
    statusParam &&
    ["DRAFT", "GENERATING", "READY", "EXPIRED"].includes(statusParam)
  ) {
    where.status = statusParam as WorkspaceStatus;
  }

  const [workspaces, total] = await Promise.all([
    db.workspace.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        topic: true,
        status: true,
        techStack: true,
        requirements: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            files: true,
            taskJobs: true,
            chatMessages: true,
          },
        },
      },
    }),
    db.workspace.count({ where }),
  ]);

  const workspaceIds = workspaces.map((workspace) => workspace.id);
  const usageByWorkspace = new Map<
    string,
    { inputTokens: number; outputTokens: number; totalCostYuan: number }
  >();

  if (workspaceIds.length > 0) {
    const usageRows = await db.aiUsageLog.groupBy({
      by: ["workspaceId"],
      where: { workspaceId: { in: workspaceIds } },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        costYuan: true,
      },
    });

    for (const row of usageRows) {
      usageByWorkspace.set(row.workspaceId, {
        inputTokens: row._sum.inputTokens ?? 0,
        outputTokens: row._sum.outputTokens ?? 0,
        totalCostYuan: Number(row._sum.costYuan ?? 0),
      });
    }
  }

  const data = workspaces.map((workspace) => {
    const usage = usageByWorkspace.get(workspace.id);
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;
    const tokenUsed = inputTokens + outputTokens;

    return {
      ...workspace,
      tokenUsed,
      totalCostYuan: usage?.totalCostYuan ?? 0,
    };
  });

  return success({
    page,
    pageSize,
    total,
    workspaces: data,
  });
}
