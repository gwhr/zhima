import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAuthMock, feedbackFindManyMock, feedbackCreateMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  feedbackFindManyMock: vi.fn(),
  feedbackCreateMock: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    userFeedback: {
      findMany: feedbackFindManyMock,
      create: feedbackCreateMock,
    },
  },
}));

import { GET, POST } from "@/app/api/feedback/route";

describe("api/feedback route", () => {
  beforeEach(() => {
    requireAuthMock.mockReset();
    feedbackFindManyMock.mockReset();
    feedbackCreateMock.mockReset();

    requireAuthMock.mockResolvedValue({
      session: { user: { id: "u1", role: "USER" } },
      error: null,
    });
  });

  it("returns feedback list for current user", async () => {
    feedbackFindManyMock.mockResolvedValue([
      {
        id: "f1",
        content: "hello",
        contact: null,
        pagePath: "/workspace",
        imageKeys: ["feedback/u1/a.png"],
        status: "OPEN",
        adminNote: null,
        createdAt: new Date("2026-03-29T10:00:00.000Z"),
        updatedAt: new Date("2026-03-29T10:00:00.000Z"),
      },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data[0].imageUrls[0]).toContain("/api/feedback/image/");
  });

  it("rejects short content", async () => {
    const req = new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "1234" }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("creates feedback with image keys", async () => {
    feedbackCreateMock.mockResolvedValue({
      id: "f2",
      content: "need improve",
      contact: "wx-123",
      pagePath: "/dashboard",
      imageKeys: ["feedback/u1/a.png"],
      status: "OPEN",
      adminNote: null,
      createdAt: new Date("2026-03-29T10:00:00.000Z"),
      updatedAt: new Date("2026-03-29T10:00:00.000Z"),
    });

    const req = new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "need improve",
        contact: "wx-123",
        imageKeys: ["feedback/u1/a.png"],
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(feedbackCreateMock).toHaveBeenCalled();
  });
});
