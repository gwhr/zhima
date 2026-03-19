import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkCode } from "@/lib/sms/provider";
import { generateNickname } from "@/lib/utils/name-generator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, phone, code } = body;

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

      const user = await db.user.create({
        data: {
          phone,
          name: name || generateNickname(),
          password: hashedPassword,
        },
      });

      return NextResponse.json({
        success: true,
        data: { id: user.id, phone: user.phone, name: user.name },
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
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || generateNickname(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "注册失败" },
      { status: 500 }
    );
  }
}
