import { AiTaskType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPlatformConfigMock, getRuntimeModelMock } = vi.hoisted(() => ({
  getPlatformConfigMock: vi.fn(),
  getRuntimeModelMock: vi.fn(),
}));

vi.mock("@/lib/system-config", () => ({
  getPlatformConfig: getPlatformConfigMock,
}));

vi.mock("@/lib/ai/runtime-model", () => ({
  getRuntimeModel: getRuntimeModelMock,
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
    getPlatformConfigMock.mockReset();
    getRuntimeModelMock.mockReset();
    getRuntimeModelMock.mockImplementation(async (id: string) => ({ id }));
  });

  it("uses configured code model for code-related tasks", async () => {
    getPlatformConfigMock.mockResolvedValue({
      codeGenModelId: "glm-4-flash",
      thesisGenModelId: "mimo-v2-pro",
    });

    const result = await selectModel("u1", "w1", AiTaskType.CODE_GEN);

    expect(getRuntimeModelMock).toHaveBeenCalledWith("glm-4-flash");
    expect(result.modelId).toBe("glm-4-flash");
    expect(result.stage).toBe("configured");
  });

  it("uses configured thesis model for thesis/chart tasks", async () => {
    getPlatformConfigMock.mockResolvedValue({
      codeGenModelId: "glm-4-flash",
      thesisGenModelId: "mimo-v2-pro",
    });

    const thesisResult = await selectModel("u1", "w1", AiTaskType.THESIS);
    const chartResult = await selectModel("u1", "w1", AiTaskType.CHART);

    expect(thesisResult.modelId).toBe("mimo-v2-pro");
    expect(chartResult.modelId).toBe("mimo-v2-pro");
  });

  it("falls back to deepseek when configured model fails", async () => {
    getPlatformConfigMock.mockResolvedValue({
      codeGenModelId: "broken-model",
      thesisGenModelId: "mimo-v2-pro",
    });
    getRuntimeModelMock
      .mockRejectedValueOnce(new Error("bad model"))
      .mockResolvedValueOnce({ id: "deepseek" });

    const result = await selectModel("u1", "w1", AiTaskType.MODIFY_SIMPLE);

    expect(getRuntimeModelMock).toHaveBeenNthCalledWith(1, "broken-model");
    expect(getRuntimeModelMock).toHaveBeenNthCalledWith(2, "deepseek");
    expect(result.modelId).toBe("deepseek");
    expect(result.stage).toBe("fallback");
  });
});
