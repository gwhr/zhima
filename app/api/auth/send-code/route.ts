import { NextResponse } from "next/server";
import { sendVerificationCode } from "@/lib/sms/provider";

function getClientIp(req: Request): string | null {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return null;
}

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: "请输入正确的手机号" },
        { status: 400 }
      );
    }

    const result = await sendVerificationCode(phone, {
      ip: getClientIp(req),
    });

    if (!result.success) {
      const status =
        result.errorCode === "RATE_LIMITED"
          ? 429
          : result.errorCode === "PROVIDER_ERROR"
            ? 502
            : 400;

      return NextResponse.json(
        { success: false, error: result.message },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
