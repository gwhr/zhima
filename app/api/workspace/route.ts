import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import { getPlatformConfig } from "@/lib/system-config";
import { hasUserRecharged } from "@/lib/user-entitlements";

type MajorCategory = "computer" | "non-computer";

function normalizeMajorCategory(value: unknown): MajorCategory {
  return value === "non-computer" ? "non-computer" : "computer";
}

function getMajorCategoryLabel(majorCategory: MajorCategory): string {
  return majorCategory === "non-computer" ? "非计算机专业" : "计算机相关专业";
}

export async function POST(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;
  const userId = session!.user.id;
  const isAdmin = session!.user.role === "ADMIN";

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    const techStack =
      body?.techStack && typeof body.techStack === "object" ? body.techStack : {};
    const requirementsInput =
      body?.requirements && typeof body.requirements === "object" && !Array.isArray(body.requirements)
        ? (body.requirements as Record<string, unknown>)
        : {};
    const majorCategory = normalizeMajorCategory(requirementsInput.majorCategory);
    const requirements = {
      ...requirementsInput,
      majorCategory,
      majorCategoryLabel: getMajorCategoryLabel(majorCategory),
    };

    if (!name || !topic) {
      return error("请输入项目名称和选题", 400);
    }
    if (!isAdmin) {
      const [platformConfig, recharged] = await Promise.all([
        getPlatformConfig().catch(() => null),
        hasUserRecharged(userId),
      ]);

      if (!recharged) {
        const freeWorkspaceLimit = Math.max(
          1,
          Number(platformConfig?.freeWorkspaceLimit ?? 3)
        );
        const workspaceCount = await db.workspace.count({
          where: { userId },
        });
        if (workspaceCount >= freeWorkspaceLimit) {
          return error(
            `免费用户最多可创建 ${freeWorkspaceLimit} 个工作空间，充值后可继续创建。`,
            403
          );
        }
      }
    }

    const workspace = await db.workspace.create({
      data: {
        userId,
        name,
        topic,
        techStack,
        requirements,
      },
    });

    return success(workspace, 201);
  } catch {
    return error("创建失败", 500);
  }
}

export async function GET() {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const workspaces = await db.workspace.findMany({
    where: { userId: session!.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      topic: true,
      status: true,
      techStack: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return success(workspaces);
}
