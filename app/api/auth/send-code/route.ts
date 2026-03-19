import { NextResponse } from "next/server";
import { sendVerificationCode } from "@/lib/sms/provider";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: "请输入正确的手机号" },
        { status: 400 }
      );
    }

    const result = await sendVerificationCode(phone);

    return NextResponse.json({
      success: result.success,
      ...(result.success ? { message: result.message } : { error: result.message }),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
