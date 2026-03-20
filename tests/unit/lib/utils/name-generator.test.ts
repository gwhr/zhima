import { describe, expect, it } from "vitest";

import { generateNickname } from "@/lib/utils/name-generator";

describe("generateNickname", () => {
  it("always ends with a 4-digit suffix", () => {
    const nickname = generateNickname();
    const digits = nickname.slice(-4);

    expect(digits).toMatch(/^\d{4}$/);
  });

  it("returns varied values across multiple calls", () => {
    const samples = new Set(
      Array.from({ length: 20 }, () => generateNickname())
    );

    expect(samples.size).toBeGreaterThan(1);
  });
});

