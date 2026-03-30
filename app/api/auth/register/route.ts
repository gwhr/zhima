import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ensureBuiltinAdminUser } from "@/lib/bootstrap/admin-user";
import { checkCode } from "@/lib/sms/provider";
import { generateNickname } from "@/lib/utils/name-generator";

const REFERRAL_REWARD_YUAN = Number(process.env.REFERRAL_REWARD_YUAN ?? 0);

function normalizeInviteCode(inviteCode?: unknown) {
  if (typeof inviteCode !== "string") return "";
  return inviteCode.trim().toUpperCase();
}

export async function POST(req: Request) {
  try {
    try {
      await ensureBuiltinAdminUser();
    } catch {
      // Do not block user registration when bootstrap admin initialization fails.
    }

    const body = await req.json();
    const { email, password, name, phone, code, inviteCode } = body;
    const normalizedInviteCode = normalizeInviteCode(inviteCode);

    let inviterCode = null;
    if (normalizedInviteCode) {
      inviterCode = await db.inviteCode.findUnique({
        where: { code: normalizedInviteCode },
      });

      if (!inviterCode) {
        return NextResponse.json(
          { success: false, error: "邀请码不存在或已失效" },
          { status: 400 }
        );
      }
    }

    if (phone) {
      if (!code) {
        return NextResponse.json(
          { success: false, error: "请输入验证码" },
          { status: 400 }
        );
      }

      const valid = await checkCode(phone, code);
      if (!valid) {
        return NextResponse.json(
          { success: false, error: "验证码错误或已过期" },
          { status: 400 }
        );
      }

      const existingPhone = await db.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return NextResponse.json(
          { success: false, error: "该手机号已注册" },
          { status: 400 }
        );
      }

      const randomPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const user = inviterCode
        ? await db.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
              data: {
                phone,
                name: name || generateNickname(),
                password: hashedPassword,
              },
            });

            await tx.inviteCode.update({
              where: { id: inviterCode.id },
              data: {
                usedCount: { increment: 1 },
                rewardTotal: { increment: REFERRAL_REWARD_YUAN },
              },
            });

            return createdUser;
          })
        : await db.user.create({
            data: {
              phone,
              name: name || generateNickname(),
              password: hashedPassword,
            },
          });

      return NextResponse.json({
        success: true,
        data: { id: user.id, phone: user.phone, name: user.name, inviteApplied: !!inviterCode },
      }, { status: 201 });
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "请输入邮箱和密码" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "密码至少 6 位" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "该邮箱已注册" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = inviterCode
      ? await db.$transaction(async (tx) => {
          const createdUser = await tx.user.create({
            data: {
              email,
              password: hashedPassword,
              name: name || generateNickname(),
            },
          });

          await tx.inviteCode.update({
            where: { id: inviterCode.id },
            data: {
              usedCount: { increment: 1 },
              rewardTotal: { increment: REFERRAL_REWARD_YUAN },
            },
          });

          return createdUser;
        })
      : await db.user.create({
          data: {
            email,
            password: hashedPassword,
            name: name || generateNickname(),
          },
        });

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name, inviteApplied: !!inviterCode },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "注册失败" },
      { status: 500 }
    );
  }
}
