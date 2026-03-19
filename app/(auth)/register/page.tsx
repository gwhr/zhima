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

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSending, setCodeSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();

    if (!data.success) {
      setError(data.error);
      setLoading(false);
      return;
    }

    const result = await signIn("email-login", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("注册成功，请手动登录");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handlePhoneRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, name }),
    });
    const data = await res.json();

    if (!data.success) {
      setError(data.error);
      setLoading(false);
      return;
    }

    const result = await signIn("phone-login", { phone, code, redirect: false });
    setLoading(false);

    if (result?.error) {
      setError("注册成功，请手动登录");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function sendCode() {
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

  return (
    <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">注册智码</CardTitle>
        <CardDescription>创建账号，开始你的 AI 毕设之旅</CardDescription>
      </CardHeader>

      <Tabs defaultValue="email" className="w-full">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">邮箱注册</TabsTrigger>
            <TabsTrigger value="phone">手机号注册</TabsTrigger>
          </TabsList>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <TabsContent value="email">
          <form onSubmit={handleEmailRegister}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">昵称（选填）</Label>
                <Input
                  id="reg-name"
                  placeholder="你的昵称"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">邮箱</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">密码</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="至少 6 位"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-confirm">确认密码</Label>
                <Input
                  id="reg-confirm"
                  type="password"
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "注册中..." : "注册"}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>

        <TabsContent value="phone">
          <form onSubmit={handlePhoneRegister}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="reg-phone-name">昵称（选填）</Label>
                <Input
                  id="reg-phone-name"
                  placeholder="你的昵称"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-phone">手机号</Label>
                <Input
                  id="reg-phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-code">验证码</Label>
                <div className="flex gap-2">
                  <Input
                    id="reg-code"
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
                    className="shrink-0 w-28"
                    onClick={sendCode}
                    disabled={codeSending || countdown > 0}
                  >
                    {countdown > 0 ? `${countdown}s` : codeSending ? "发送中" : "获取验证码"}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "注册中..." : "注册"}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>

      <div className="px-6 pb-6 text-center">
        <p className="text-sm text-muted-foreground">
          已有账号？{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            去登录
          </Link>
        </p>
      </div>
    </Card>
  );
}
