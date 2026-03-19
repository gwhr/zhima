import { db } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { oldPassword, newPassword } = await req.json();

  if (!oldPassword || !newPassword) {
    return error("请输入旧密码和新密码", 400);
  }

  if (newPassword.length < 6) {
    return error("新密码至少 6 位", 400);
  }

  const user = await db.user.findUnique({
    where: { id: session!.user.id },
  });

  if (!user) {
    return error("用户不存在", 404);
  }

  const isValid = await bcrypt.compare(oldPassword, user.password);
  if (!isValid) {
    return error("旧密码错误", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await db.user.update({
    where: { id: session!.user.id },
    data: { password: hashedPassword },
  });

  return success({ message: "密码修改成功" });
}
