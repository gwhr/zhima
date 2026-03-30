"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSending, setCodeSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  async function resolveTargetPath() {
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    return session?.user?.role === "ADMIN" ? "/admin" : "/dashboard";
  }

  function ensureAgreementAccepted() {
    if (agreementAccepted) return true;
    setError("请先阅读并同意《用户协议》和《隐私政策》");
    return false;
  }

  async function handleAccountLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!ensureAgreementAccepted()) return;

    setLoading(true);
    const result = await signIn("email-login", {
      identifier,
      password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push(await resolveTargetPath());
    router.refresh();
  }

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!ensureAgreementAccepted()) return;

    setLoading(true);
    const result = await signIn("phone-login", {
      phone,
      code,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push(await resolveTargetPath());
    router.refresh();
  }

  async function sendCode() {
    if (!ensureAgreementAccepted()) {
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }

    setCodeSending(true);
    setError("");

    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setCodeSending(false);

    if (!data.success) {
      setError(data.error);
      return;
    }

    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  const agreementBlock = (
    <label className="w-full flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-600"
        checked={agreementAccepted}
        onChange={(e) => setAgreementAccepted(e.target.checked)}
      />
      <span>
        我已阅读并同意
        <Link href="/terms" className="mx-1 text-primary hover:underline">
          《用户协议》
        </Link>
        和
        <Link href="/privacy" className="ml-1 text-primary hover:underline">
          《隐私政策》
        </Link>
      </span>
    </label>
  );

  return (
    <Card className="w-full max-w-md border-white/80 bg-white/88 shadow-[0_28px_65px_-42px_rgba(15,23,42,0.6)] backdrop-blur-sm">
      <CardHeader className="pb-4 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">登录智码</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          选择你习惯的方式，继续你的项目开发
        </CardDescription>
      </CardHeader>

      <Tabs defaultValue="account" className="w-full">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/60 p-1">
            <TabsTrigger
              value="account"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              账号登录
            </TabsTrigger>
            <TabsTrigger
              value="phone"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              手机号登录
            </TabsTrigger>
          </TabsList>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <TabsContent value="account">
          <form onSubmit={handleAccountLogin}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">邮箱或手机号</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="请输入邮箱或手机号"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {agreementBlock}
              <Button type="submit" className="w-full" disabled={loading || !agreementAccepted}>
                {loading ? "登录中..." : "登录"}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>

        <TabsContent value="phone">
          <form onSubmit={handlePhoneLogin}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">验证码</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    type="text"
                    placeholder="6位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-28 shrink-0"
                    onClick={sendCode}
                    disabled={codeSending || countdown > 0 || !agreementAccepted}
                  >
                    {countdown > 0 ? `${countdown}s` : codeSending ? "发送中" : "获取验证码"}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {agreementBlock}
              <Button type="submit" className="w-full" disabled={loading || !agreementAccepted}>
                {loading ? "登录中..." : "登录"}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>

      <div className="px-6 pb-6 text-center">
        <p className="text-sm text-muted-foreground">
          还没有账号？{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            立即注册
          </Link>
        </p>
      </div>
    </Card>
  );
}
