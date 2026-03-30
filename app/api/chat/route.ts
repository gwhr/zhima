import { streamText } from "ai";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { selectModel } from "@/lib/ai/router";
import { recordUsage } from "@/lib/ai/usage";
import { getSystemPrompt } from "@/lib/ai/prompts";
import { downloadFile } from "@/lib/storage/oss";
import { freezeTokenReservation, releaseTokenReservation } from "@/lib/billing/token-wallet";
import { getPlatformConfig } from "@/lib/system-config";
import type { AiTaskType } from "@prisma/client";

type TokenUsageLike = {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  cacheHitTokens?: number;
  cachedInputTokens?: number;
  cacheReadInputTokens?: number;
};

async function buildProjectContext(workspaceId: string): Promise<string> {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return "";

  const techStack = workspace.techStack as Record<string, string>;
  const requirements = workspace.requirements as Record<string, unknown>;
  const techStr = Object.entries(techStack)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  let context = `\n\n--- 项目上下文 ---\n`;
  context += `项目名称：${workspace.name}\n`;
  context += `选题：${workspace.topic}\n`;
  context += `技术栈：${techStr}\n`;

  if (requirements?.summary) {
    context += `项目描述：${requirements.summary}\n`;
  }
  if (Array.isArray(requirements?.roles)) {
    context += `系统角色：${(requirements.roles as { name: string }[])
      .map((r) => r.name)
      .join("、")}\n`;
  }
  if (Array.isArray(requirements?.modules)) {
    const modules = requirements.modules as { name: string; features: string[] }[];
    context += `功能模块：\n`;
    for (const mod of modules) {
      context += `  - ${mod.name}: ${mod.features.join("、")}\n`;
    }
  }
  if (Array.isArray(requirements?.tables)) {
    context += `数据库表：${(requirements.tables as string[]).join("、")}\n`;
  }

  const files = await db.workspaceFile.findMany({
    where: { workspaceId, type: "CODE" },
    orderBy: { path: "asc" },
  });

  if (files.length > 0) {
    context += `\n--- 已生成的代码文件 ---\n`;
    let totalSize = 0;
    const maxContextSize = 12_000;

    for (const file of files) {
      if (totalSize > maxContextSize) {
        context += `\n... 更多文件省略（共 ${files.length} 个）...\n`;
        break;
      }
      try {
        const buf = await downloadFile(file.storageKey);
        const content = buf.toString("utf-8").slice(0, 2000);
        context += `\n### 文件: ${file.path}\n\`\`\`\n${content}\n\`\`\`\n`;
        totalSize += content.length;
      } catch {
        context += `\n### 文件: ${file.path}\n[无法读取]\n`;
      }
    }
  }

  return context;
}

function normalizeUsage(usage: TokenUsageLike | undefined) {
  const inputTokens = usage?.inputTokens ?? usage?.promptTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? usage?.completionTokens ?? 0;
  const cacheHitTokens =
    usage?.cacheHitTokens ?? usage?.cachedInputTokens ?? usage?.cacheReadInputTokens ?? 0;
  return {
    inputTokens: Math.max(0, inputTokens),
    outputTokens: Math.max(0, outputTokens),
    cacheHitTokens: Math.max(0, cacheHitTokens),
  };
}

export async function POST(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { messages, workspaceId, taskType = "MODIFY_SIMPLE" } = await req.json();

  if (!workspaceId) {
    return new Response("缺少 workspaceId", { status: 400 });
  }

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace || workspace.userId !== session!.user.id) {
    return new Response("无权限", { status: 403 });
  }

  const platformConfig = await getPlatformConfig().catch(() => null);
  const chatReserve = platformConfig?.chatTokenReserve ?? 8_000;

  let reservationId = "";
  try {
    const reservation = await freezeTokenReservation({
      userId: session!.user.id,
      workspaceId,
      source: "CHAT",
      reservePoints: chatReserve,
      description: "Freeze points for AI chat",
      metadata: {
        taskType,
      },
    });
    reservationId = reservation.reservationId;
  } catch (reserveError) {
    return new Response(
      reserveError instanceof Error ? reserveError.message : "Token 余额不足",
      { status: 402 }
    );
  }

  const { model, modelId } = await selectModel(
    session!.user.id,
    workspaceId,
    taskType as AiTaskType
  );

  const basePrompt = getSystemPrompt(taskType as AiTaskType);
  const projectContext = await buildProjectContext(workspaceId);
  const systemPrompt = `${basePrompt}${projectContext}

当用户要求修改代码时，请：
1. 明确指出要修改哪个文件
2. 给出完整的修改后代码（用代码块包裹，并标注文件路径）
3. 解释修改的原因和影响
4. 如果涉及多个文件联动，按依赖顺序列出`;

  const startTime = Date.now();
  const lastUserMessage = messages[messages.length - 1];

  if (lastUserMessage?.role === "user") {
    await db.chatMessage.create({
      data: {
        workspaceId,
        role: "USER",
        content: lastUserMessage.content,
      },
    });
  }

  try {
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      async onFinish({ text, usage }) {
        const durationMs = Date.now() - startTime;
        const normalizedUsage = normalizeUsage(usage as TokenUsageLike);

        await db.chatMessage.create({
          data: {
            workspaceId,
            role: "ASSISTANT",
            content: text,
            metadata: { modelId, taskType },
          },
        });

        try {
          await recordUsage({
            userId: session!.user.id,
            workspaceId,
            taskType: taskType as AiTaskType,
            modelId,
            inputTokens: normalizedUsage.inputTokens,
            outputTokens: normalizedUsage.outputTokens,
            cacheHitTokens: normalizedUsage.cacheHitTokens,
            durationMs,
            reservationId,
          });
        } catch (settleError) {
          await releaseTokenReservation({
            reservationId,
            reason:
              settleError instanceof Error
                ? settleError.message
                : "Chat settlement failed",
          }).catch(() => {});
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (chatError) {
    await releaseTokenReservation({
      reservationId,
      reason: chatError instanceof Error ? chatError.message : "Chat start failed",
    }).catch(() => {});

    return new Response(
      chatError instanceof Error ? chatError.message : "AI 对话失败",
      { status: 500 }
    );
  }
}
