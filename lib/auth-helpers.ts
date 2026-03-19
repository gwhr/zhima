import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { error } from "@/lib/api-response";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return { session: null, error: error("请先登录", 401) };
  }
  return { session, error: null };
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) {
    return { session: null, error: error("请先登录", 401) };
  }
  if (session.user.role !== "ADMIN") {
    return { session: null, error: error("无权限", 403) };
  }
  return { session, error: null };
}
