import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const { name, topic, techStack, requirements } = await req.json();

    if (!name || !topic) {
      return error("请输入项目名称和选题", 400);
    }

    const workspace = await db.workspace.create({
      data: {
        userId: session!.user.id,
        name,
        topic,
        techStack: techStack || {},
        requirements: requirements || [],
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
