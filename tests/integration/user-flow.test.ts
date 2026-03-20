import { beforeEach, describe, expect, it, vi } from "vitest";

type User = { id: string; email: string; name: string; password: string };
type Workspace = { id: string; userId: string; name: string; topic: string };

const users: User[] = [];
const workspaces: Workspace[] = [];

const {
  userFindUniqueMock,
  userCreateMock,
  workspaceCreateMock,
  workspaceFindManyMock,
  hashMock,
  generateNicknameMock,
  requireAuthMock,
} = vi.hoisted(() => ({
  userFindUniqueMock: vi.fn(),
  userCreateMock: vi.fn(),
  workspaceCreateMock: vi.fn(),
  workspaceFindManyMock: vi.fn(),
  hashMock: vi.fn(),
  generateNicknameMock: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: userFindUniqueMock,
      create: userCreateMock,
    },
    workspace: {
      create: workspaceCreateMock,
      findMany: workspaceFindManyMock,
    },
  },
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

vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/sms/provider", () => ({
  checkCode: vi.fn(),
}));

import { POST as registerPost } from "@/app/api/auth/register/route";
import { GET as workspaceGet, POST as workspacePost } from "@/app/api/workspace/route";

describe("integration: register -> create workspace -> list workspace", () => {
  beforeEach(() => {
    users.length = 0;
    workspaces.length = 0;

    userFindUniqueMock.mockReset();
    userCreateMock.mockReset();
    workspaceCreateMock.mockReset();
    workspaceFindManyMock.mockReset();
    hashMock.mockReset();
    generateNicknameMock.mockReset();
    requireAuthMock.mockReset();

    hashMock.mockResolvedValue("hashed-password");
    generateNicknameMock.mockReturnValue("测试昵称0001");

    userFindUniqueMock.mockImplementation(async ({ where }: { where: { email?: string } }) => {
      if (!where.email) return null;
      return users.find((u) => u.email === where.email) ?? null;
    });

    userCreateMock.mockImplementation(async ({ data }: { data: { email: string; password: string; name: string } }) => {
      const user = {
        id: `u${users.length + 1}`,
        email: data.email,
        password: data.password,
        name: data.name,
      };
      users.push(user);
      return user;
    });

    workspaceCreateMock.mockImplementation(async ({ data }: { data: { userId: string; name: string; topic: string } }) => {
      const workspace = {
        id: `w${workspaces.length + 1}`,
        userId: data.userId,
        name: data.name,
        topic: data.topic,
      };
      workspaces.push(workspace);
      return workspace;
    });

    workspaceFindManyMock.mockImplementation(async ({ where }: { where: { userId: string } }) => {
      return workspaces.filter((w) => w.userId === where.userId);
    });

    requireAuthMock.mockImplementation(async () => {
      const currentUser = users[0];
      if (!currentUser) {
        return {
          session: null,
          error: new Response(
            JSON.stringify({ success: false, error: "请先登录" }),
            { status: 401 }
          ),
        };
      }
      return {
        session: { user: { id: currentUser.id, role: "USER" } },
        error: null,
      };
    });
  });

  it("completes core user flow", async () => {
    const registerReq = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "flow@example.com",
        password: "Passw0rd123!",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const registerRes = await registerPost(registerReq);
    expect(registerRes.status).toBe(201);

    const createWsReq = new Request("http://localhost/api/workspace", {
      method: "POST",
      body: JSON.stringify({
        name: "flow-workspace",
        topic: "flow-topic",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const createWsRes = await workspacePost(createWsReq);
    expect(createWsRes.status).toBe(201);

    const listRes = await workspaceGet();
    const listData = await listRes.json();

    expect(listRes.status).toBe(200);
    expect(listData.success).toBe(true);
    expect(listData.data).toHaveLength(1);
    expect(listData.data[0].name).toBe("flow-workspace");
  });
});
