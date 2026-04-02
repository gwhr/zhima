"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RegisterPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSending, setEmailCodeSending] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsCodeSending, setSmsCodeSending] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setInviteCode(ref.trim().toUpperCase());
  }, []);

  useEffect(() => {
    if (emailCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setEmailCountdown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [emailCountdown]);

  useEffect(() => {
    if (smsCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setSmsCountdown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [smsCountdown]);

  function ensureAgreementAccepted() {
    if (agreementAccepted) return true;
    const confirmed = window.confirm(
      "继续操作需要同意《用户协议》和《隐私政策》，是否同意并继续？"
    );
    if (confirmed) {
      setAgreementAccepted(true);
      setError("");
      return true;
    }
    setError("请先阅读并同意《用户协议》和《隐私政策》");
    return false;
  }

  async function sendEmailCode() {
    if (!ensureAgreementAccepted()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("请输入正确的邮箱地址");
      return;
    }

    setError("");
    setEmailCodeSending(true);
    try {
      const response = await fetch("/api/auth/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "邮箱验证码发送失败");
      }
      setEmailCountdown(60);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "邮箱验证码发送失败");
    } finally {
      setEmailCodeSending(false);
    }
  }

  async function sendPhoneCode() {
    if (!ensureAgreementAccepted()) return;
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      setError("请输入正确的手机号");
      return;
    }

    setError("");
    setSmsCodeSending(true);
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "短信验证码发送失败");
      }
      setSmsCountdown(60);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "短信验证码发送失败");
    } finally {
      setSmsCodeSending(false);
    }
  }

  async function handleEmailRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!ensureAgreementAccepted()) return;
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    if (!emailCode.trim()) {
      setError("请输入邮箱验证码");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          emailCode: emailCode.trim(),
          password,
          name,
          inviteCode,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "注册失败");
      }

      const result = await signIn("email-login", {
        identifier: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("注册成功，请手动登录");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!ensureAgreementAccepted()) return;
    if (!smsCode.trim()) {
      setError("请输入短信验证码");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          code: smsCode.trim(),
          name,
          inviteCode,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "注册失败");
      }

      const result = await signIn("phone-login", {
        phone: phone.trim(),
        code: smsCode.trim(),
        redirect: false,
      });

      if (result?.error) {
        setError("注册成功，请手动登录");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  const agreementBlock = (
    <label className="flex w-full items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-600"
        checked={agreementAccepted}
        onChange={(event) => setAgreementAccepted(event.target.checked)}
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
        <CardTitle className="text-2xl font-semibold tracking-tight">注册智码</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          创建账号，开启你的 AI 毕设项目链路
        </CardDescription>
      </CardHeader>

      <Tabs defaultValue="email" className="w-full">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/60 p-1">
            <TabsTrigger
              value="email"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              邮箱注册
            </TabsTrigger>
            <TabsTrigger
              value="phone"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              手机号注册
            </TabsTrigger>
          </TabsList>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <TabsContent value="email">
          <form onSubmit={handleEmailRegister}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name-email">昵称（选填）</Label>
                <Input
                  id="reg-name-email"
                  placeholder="你的昵称"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">邮箱</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email-code">邮箱验证码</Label>
                <div className="flex gap-2">
                  <Input
                    id="reg-email-code"
                    type="text"
                    placeholder="6位验证码"
                    value={emailCode}
                    onChange={(event) => setEmailCode(event.target.value)}
                    required
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-28 shrink-0"
                    onClick={sendEmailCode}
                    disabled={emailCodeSending || emailCountdown > 0}
                  >
                    {emailCountdown > 0
                      ? `${emailCountdown}s`
                      : emailCodeSending
                        ? "发送中"
                        : "获取验证码"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">密码</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="至少 6 位"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password">确认密码</Label>
                <Input
                  id="reg-confirm-password"
                  type="password"
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-invite-email">邀请码（选填）</Label>
                <Input
                  id="reg-invite-email"
                  placeholder="输入邀请码可关联邀请推广"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.trim().toUpperCase())}
                  maxLength={32}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              {agreementBlock}
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
                <Label htmlFor="reg-name-phone">昵称（选填）</Label>
                <Input
                  id="reg-name-phone"
                  placeholder="你的昵称"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-phone">手机号</Label>
                <Input
                  id="reg-phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-sms-code">短信验证码</Label>
                <div className="flex gap-2">
                  <Input
                    id="reg-sms-code"
                    type="text"
                    placeholder="6位验证码"
                    value={smsCode}
                    onChange={(event) => setSmsCode(event.target.value)}
                    required
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-28 shrink-0"
                    onClick={sendPhoneCode}
                    disabled={smsCodeSending || smsCountdown > 0}
                  >
                    {smsCountdown > 0
                      ? `${smsCountdown}s`
                      : smsCodeSending
                        ? "发送中"
                        : "获取验证码"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-invite-phone">邀请码（选填）</Label>
                <Input
                  id="reg-invite-phone"
                  placeholder="输入邀请码可关联邀请推广"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.trim().toUpperCase())}
                  maxLength={32}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              {agreementBlock}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "注册中..." : "注册"}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>

      <div className="px-6 pb-6 text-center">
        <p className="text-sm text-muted-foreground">
          已有账号？
          <Link href="/login" className="ml-1 font-medium text-primary hover:underline">
            去登录
          </Link>
        </p>
      </div>
    </Card>
  );
}
