import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ensureBuiltinAdminUser } from "@/lib/bootstrap/admin-user";
import { verifyCode } from "@/lib/sms/provider";

const DEVICE_FREE_LOGIN_DAYS = 7;
const DEVICE_FREE_LOGIN_MAX_AGE_SECONDS =
  DEVICE_FREE_LOGIN_DAYS * 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "email-login",
      name: "账号登录",
      credentials: {
        identifier: { label: "账号", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        await ensureBuiltinAdminUser();

        const identifier = credentials?.identifier?.trim();

        if (!identifier || !credentials?.password) {
          throw new Error("请输入账号和密码");
        }

        const user = await db.user.findFirst({
          where: identifier.includes("@")
            ? { email: identifier }
            : { phone: identifier },
        });

        if (!user) throw new Error("账号不存在");

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error("密码错误");

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    CredentialsProvider({
      id: "phone-login",
      name: "手机号登录",
      credentials: {
        phone: { label: "手机号", type: "text" },
        code: { label: "验证码", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) {
          throw new Error("请输入手机号和验证码");
        }

        const valid = await verifyCode(credentials.phone, credentials.code);
        if (!valid) throw new Error("验证码错误或已过期");

        let user = await db.user.findUnique({
          where: { phone: credentials.phone },
        });

        if (!user) {
          throw new Error("该手机号未注册，请先注册");
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    // Keep users signed in on the same device for 7 days.
    maxAge: DEVICE_FREE_LOGIN_MAX_AGE_SECONDS,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: DEVICE_FREE_LOGIN_MAX_AGE_SECONDS,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as unknown as { role?: string }).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.userId as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
