import { generateText } from "ai";
import { db } from "@/lib/db";
import { selectModel } from "@/lib/ai/router";
import { recordUsage } from "@/lib/ai/usage";
import { buildThesisPrompt, chapterRequirements } from "@/lib/ai/prompts/thesis-generate";

const chapterOrder = [
  "abstract",
  "introduction",
  "requirements",
  "design",
  "implementation",
  "testing",
  "conclusion",
] as const;

const chapterWordCounts: Record<string, string> = {
  abstract: "500",
  introduction: "3000",
  requirements: "3000",
  design: "4000",
  implementation: "4000",
  testing: "2000",
  conclusion: "1500",
};

interface ThesisGenParams {
  userId: string;
  workspaceId: string;
  topic: string;
  techStack: string;
  modules: string;
  jobId: string;
}

export async function generateThesis(params: ThesisGenParams) {
  const chapters: Record<string, string> = {};
  const totalChapters = chapterOrder.length;

  for (let i = 0; i < totalChapters; i++) {
    const chapter = chapterOrder[i];

    await db.taskJob.update({
      where: { id: params.jobId },
      data: { progress: Math.round(((i + 1) / totalChapters) * 100) },
    });

    const { model, modelId } = await selectModel(
      params.userId,
      params.workspaceId,
      "THESIS"
    );

    const prompt = buildThesisPrompt({
      topic: params.topic,
      techStack: params.techStack,
      modules: params.modules,
      chapter,
      wordCount: chapterWordCounts[chapter],
    });

    const startTime = Date.now();

    const result = await generateText({
      model,
      prompt,
    });
    const usage = result.usage as {
      inputTokens?: number;
      outputTokens?: number;
      promptTokens?: number;
      completionTokens?: number;
    };

    await recordUsage({
      userId: params.userId,
      workspaceId: params.workspaceId,
      taskType: "THESIS",
      modelId,
      inputTokens: usage.inputTokens ?? usage.promptTokens ?? 0,
      outputTokens: usage.outputTokens ?? usage.completionTokens ?? 0,
      durationMs: Date.now() - startTime,
    });

    chapters[chapter] = result.text;
  }

  return chapters;
}

export function getChapterList() {
  return chapterOrder.map((key) => ({
    key,
    name: chapterRequirements[key]?.split("，")[0] || key,
  }));
}
