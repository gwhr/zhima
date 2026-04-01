import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAuthMock,
  workspaceCreateMock,
  workspaceFindManyMock,
  workspaceCountMock,
  getPlatformConfigMock,
  hasUserRechargedMock,
} = vi.hoisted(
  () => ({
    requireAuthMock: vi.fn(),
    workspaceCreateMock: vi.fn(),
    workspaceFindManyMock: vi.fn(),
    workspaceCountMock: vi.fn(),
    getPlatformConfigMock: vi.fn(),
    hasUserRechargedMock: vi.fn(),
  })
);

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    workspace: {
      create: workspaceCreateMock,
      findMany: workspaceFindManyMock,
      count: workspaceCountMock,
    },
  },
}));

vi.mock("@/lib/system-config", () => ({
  getPlatformConfig: getPlatformConfigMock,
}));

vi.mock("@/lib/user-entitlements", () => ({
  hasUserRecharged: hasUserRechargedMock,
}));

import { GET, POST } from "@/app/api/workspace/route";

describe("workspace route", () => {
  beforeEach(() => {
    requireAuthMock.mockReset();
    workspaceCreateMock.mockReset();
    workspaceFindManyMock.mockReset();
    workspaceCountMock.mockReset();
    getPlatformConfigMock.mockReset();
    hasUserRechargedMock.mockReset();

    getPlatformConfigMock.mockResolvedValue({ freeWorkspaceLimit: 3 });
    hasUserRechargedMock.mockResolvedValue(false);
    workspaceCountMock.mockResolvedValue(0);
  });

  it("returns auth error for GET when unauthenticated", async () => {
    requireAuthMock.mockResolvedValue({
      session: null,
      error: new Response(
        JSON.stringify({ success: false, error: "请先登录" }),
        { status: 401 }
      ),
    });

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("creates workspace successfully", async () => {
    requireAuthMock.mockResolvedValue({
      session: { user: { id: "u1", role: "USER" } },
      error: null,
    });
    workspaceCreateMock.mockResolvedValue({
      id: "w1",
      userId: "u1",
      name: "test-workspace",
      topic: "test-topic",
    });

    const req = new Request("http://localhost/api/workspace", {
      method: "POST",
      body: JSON.stringify({
        name: "test-workspace",
        topic: "test-topic",
        techStack: { backend: "spring-boot" },
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(workspaceCreateMock).toHaveBeenCalled();
  });

  it("returns workspace list for current user", async () => {
    requireAuthMock.mockResolvedValue({
      session: { user: { id: "u1", role: "USER" } },
      error: null,
    });
    workspaceFindManyMock.mockResolvedValue([
      { id: "w1", name: "A", topic: "T", status: "DRAFT" },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});
