import { requireAdmin } from "@/lib/auth-helpers";
import { success } from "@/lib/api-response";
import { db } from "@/lib/db";
import type { JobStatus, JobType, Prisma } from "@prisma/client";

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
  const statusParam = searchParams.get("status");
  const typeParam = searchParams.get("type");
  const search = searchParams.get("search")?.trim() || "";

  const where: Prisma.TaskJobWhereInput = {};
  if (
    statusParam &&
    ["PENDING", "RUNNING", "COMPLETED", "FAILED"].includes(statusParam)
  ) {
    where.status = statusParam as JobStatus;
  }

  if (
    typeParam &&
    ["CODE_GEN", "THESIS_GEN", "CHART_RENDER", "PREVIEW"].includes(typeParam)
  ) {
    where.type = typeParam as JobType;
  }

  if (search) {
    where.OR = [
      { id: { contains: search, mode: "insensitive" } },
      { workspace: { id: { contains: search, mode: "insensitive" } } },
      { workspace: { name: { contains: search, mode: "insensitive" } } },
      { workspace: { topic: { contains: search, mode: "insensitive" } } },
      { workspace: { user: { name: { contains: search, mode: "insensitive" } } } },
      { workspace: { user: { email: { contains: search, mode: "insensitive" } } } },
      { workspace: { user: { phone: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [jobs, total, statusCount] = await Promise.all([
    db.taskJob.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        result: true,
        error: true,
        createdAt: true,
        updatedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            topic: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    }),
    db.taskJob.count({ where }),
    db.taskJob.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
  ]);

  const formatted = jobs.map((job) => {
    const result =
      job.result && typeof job.result === "object"
        ? (job.result as Record<string, unknown>)
        : {};

    return {
      ...job,
      model: typeof result.model === "string" ? result.model : null,
      inputTokens:
        typeof result.inputTokens === "number" ? result.inputTokens : null,
      outputTokens:
        typeof result.outputTokens === "number" ? result.outputTokens : null,
      totalTokens:
        typeof result.totalTokens === "number" ? result.totalTokens : null,
      stage: typeof result.stage === "string" ? result.stage : null,
      detail: typeof result.detail === "string" ? result.detail : null,
      durationMs:
        typeof result.durationMs === "number" ? result.durationMs : null,
    };
  });

  return success({
    page,
    pageSize,
    total,
    jobs: formatted,
    summary: {
      PENDING: statusCount.find((item) => item.status === "PENDING")?._count._all ?? 0,
      RUNNING: statusCount.find((item) => item.status === "RUNNING")?._count._all ?? 0,
      COMPLETED:
        statusCount.find((item) => item.status === "COMPLETED")?._count._all ?? 0,
      FAILED: statusCount.find((item) => item.status === "FAILED")?._count._all ?? 0,
    },
  });
}
