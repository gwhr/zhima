import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendVerificationCodeMock } = vi.hoisted(() => ({
  sendVerificationCodeMock: vi.fn(),
}));

vi.mock("@/lib/sms/provider", () => ({
  sendVerificationCode: sendVerificationCodeMock,
}));

import { POST } from "@/app/api/auth/send-code/route";

describe("POST /api/auth/send-code", () => {
  beforeEach(() => {
    sendVerificationCodeMock.mockReset();
  });

  it("returns 400 for invalid phone", async () => {
    const req = new Request("http://localhost/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "123" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("returns 429 when provider reports rate limit", async () => {
    sendVerificationCodeMock.mockResolvedValue({
      success: false,
      errorCode: "RATE_LIMITED",
      message: "too many requests",
    });

    const req = new Request("http://localhost/api/auth/send-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: JSON.stringify({ phone: "13800000000" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.success).toBe(false);
    expect(sendVerificationCodeMock).toHaveBeenCalledWith("13800000000", {
      ip: "1.2.3.4",
    });
  });

  it("returns 200 for success", async () => {
    sendVerificationCodeMock.mockResolvedValue({
      success: true,
      message: "ok",
    });

    const req = new Request("http://localhost/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "13800000000" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("ok");
  });
});
