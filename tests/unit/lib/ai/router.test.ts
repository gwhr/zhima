import { AiTaskType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    userQuota: {
      findUnique: findUniqueMock,
    },
  },
}));

import { getQuotaStage, selectModel } from "@/lib/ai/router";

describe("getQuotaStage", () => {
  it("returns normal when budget is 0", () => {
    expect(getQuotaStage(10, 0)).toBe("normal");
  });

  it("returns tightened/economy/exceeded by ratio", () => {
    expect(getQuotaStage(60, 100)).toBe("tightened");
    expect(getQuotaStage(90, 100)).toBe("economy");
    expect(getQuotaStage(100, 100)).toBe("exceeded");
  });
});

describe("selectModel", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("uses glm when quota is missing", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await selectModel("u1", "w1", AiTaskType.MODIFY_SIMPLE);

    expect(result.modelId).toBe("glm");
    expect(result.stage).toBe("normal");
  });

  it("uses opus for CODE_GEN in tightened stage", async () => {
    findUniqueMock.mockResolvedValue({
      opusUsed: 70,
      opusBudget: 100,
    });

    const result = await selectModel("u1", "w1", AiTaskType.CODE_GEN);

    expect(result.modelId).toBe("opus");
    expect(result.stage).toBe("tightened");
  });

  it("falls back to glm for economy stage", async () => {
    findUniqueMock.mockResolvedValue({
      opusUsed: 95,
      opusBudget: 100,
    });

    const result = await selectModel("u1", "w1", AiTaskType.CHART);

    expect(result.modelId).toBe("glm");
    expect(result.stage).toBe("economy");
  });

  it("throws when quota exceeded", async () => {
    findUniqueMock.mockResolvedValue({
      opusUsed: 100,
      opusBudget: 100,
    });

    await expect(
      selectModel("u1", "w1", AiTaskType.CODE_GEN)
    ).rejects.toThrow("额度已用完");
  });
});
