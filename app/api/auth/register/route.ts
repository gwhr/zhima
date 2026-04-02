import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ensureBuiltinAdminUser } from "@/lib/bootstrap/admin-user";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { checkEmailCode } from "@/lib/email/provider";
import { checkCode } from "@/lib/sms/provider";
import { generateNickname } from "@/lib/utils/name-generator";

const REFERRAL_REWARD_YUAN = Number(process.env.REFERRAL_REWARD_YUAN ?? 0);

function normalizeInviteCode(inviteCode?: unknown) {
  if (typeof inviteCode !== "string") return "";
  return inviteCode.trim().toUpperCase();
}

function normalizeEmail(value?: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function normalizePhone(value?: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

async function findInviter(normalizedInviteCode: string) {
  if (!normalizedInviteCode) return null;
  return db.inviteCode.findUnique({
    where: { code: normalizedInviteCode },
  });
}

async function applyInviteReward(
  tx: Prisma.TransactionClient,
  inviterCodeId: string
) {
  await tx.inviteCode.update({
    where: { id: inviterCodeId },
    data: {
      usedCount: { increment: 1 },
      rewardTotal: { increment: REFERRAL_REWARD_YUAN },
    },
  });
}

export async function POST(req: Request) {
  try {
    try {
      await ensureBuiltinAdminUser();
    } catch {
      // 不阻塞注册主流程
    }

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const emailCode = typeof body.emailCode === "string" ? body.emailCode.trim() : "";
    const phone = normalizePhone(body.phone);
    const smsCode = typeof body.code === "string" ? body.code.trim() : "";
    const normalizedInviteCode = normalizeInviteCode(body.inviteCode);

    const inviterCode = await findInviter(normalizedInviteCode);
    if (normalizedInviteCode && !inviterCode) {
      return NextResponse.json(
        { success: false, error: "邀请码不存在或已失效" },
        { status: 400 }
      );
    }

    // 手机号注册
    if (phone) {
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return NextResponse.json(
          { success: false, error: "请输入正确的手机号" },
          { status: 400 }
        );
      }

      if (!smsCode) {
        return NextResponse.json(
          { success: false, error: "请输入短信验证码" },
          { status: 400 }
        );
      }

      const smsValid = await checkCode(phone, smsCode);
      if (!smsValid) {
        return NextResponse.json(
          { success: false, error: "短信验证码错误或已过期" },
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
            await applyInviteReward(tx, inviterCode.id);
            return createdUser;
          })
        : await db.user.create({
            data: {
              phone,
              name: name || generateNickname(),
              password: hashedPassword,
            },
          });

      return NextResponse.json(
        {
          success: true,
          data: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            inviteApplied: !!inviterCode,
          },
        },
        { status: 201 }
      );
    }

    // 邮箱注册
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "请输入邮箱和密码" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "请输入正确的邮箱地址" },
        { status: 400 }
      );
    }

    if (!emailCode) {
      return NextResponse.json(
        { success: false, error: "请输入邮箱验证码" },
        { status: 400 }
      );
    }

    const emailValid = await checkEmailCode(email, emailCode);
    if (!emailValid) {
      return NextResponse.json(
        { success: false, error: "邮箱验证码错误或已过期" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "密码至少 6 位" },
        { status: 400 }
      );
    }

    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
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
          await applyInviteReward(tx, inviterCode.id);
          return createdUser;
        })
      : await db.user.create({
          data: {
            email,
            password: hashedPassword,
            name: name || generateNickname(),
          },
        });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          inviteApplied: !!inviterCode,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ success: false, error: "注册失败" }, { status: 500 });
  }
}
