import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  userFindUniqueMock,
  userCreateMock,
  checkCodeMock,
  hashMock,
  generateNicknameMock,
} = vi.hoisted(() => ({
  userFindUniqueMock: vi.fn(),
  userCreateMock: vi.fn(),
  checkCodeMock: vi.fn(),
  hashMock: vi.fn(),
  generateNicknameMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: userFindUniqueMock,
      create: userCreateMock,
    },
  },
}));

vi.mock("@/lib/sms/provider", () => ({
  checkCode: checkCodeMock,
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: hashMock,
  },
  hash: hashMock,
}));

vi.mock("@/lib/utils/name-generator", () => ({
  generateNickname: generateNicknameMock,
}));

import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    userFindUniqueMock.mockReset();
    userCreateMock.mockReset();
    checkCodeMock.mockReset();
    hashMock.mockReset();
    generateNicknameMock.mockReset();

    hashMock.mockResolvedValue("hashed-password");
    generateNicknameMock.mockReturnValue("测试昵称0001");
  });

  it("returns 400 when email/password are missing", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("returns 400 when email already exists", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "u1" });

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "exists@example.com",
        password: "Passw0rd123!",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("已注册");
  });

  it("creates email user successfully", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    userCreateMock.mockResolvedValue({
      id: "u2",
      email: "new@example.com",
      name: "new-user",
    });

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "new@example.com",
        password: "Passw0rd123!",
        name: "new-user",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(hashMock).toHaveBeenCalledWith("Passw0rd123!", 10);
    expect(data.success).toBe(true);
    expect(data.data.email).toBe("new@example.com");
  });

  it("returns 400 when phone code is invalid", async () => {
    checkCodeMock.mockResolvedValue(false);

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        phone: "13800000000",
        code: "0000",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
