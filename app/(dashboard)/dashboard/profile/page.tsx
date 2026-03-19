"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatar: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdMessage, setPwdMessage] = useState("");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProfile(data.data);
          setName(data.data.name || "");
        }
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setSaving(false);
    setMessage(data.success ? "保存成功" : data.error);
  }

  async function handleChangePassword() {
    setChangingPwd(true);
    setPwdMessage("");
    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json();
    setChangingPwd(false);
    setPwdMessage(data.success ? "密码修改成功" : data.error);
    if (data.success) {
      setOldPassword("");
      setNewPassword("");
    }
  }

  if (!profile) return <div className="p-6 text-muted-foreground">加载中...</div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">个人设置</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>邮箱</Label>
            <Input value={profile.email || "未设置"} disabled />
          </div>
          <div className="space-y-2">
            <Label>手机号</Label>
            <Input value={profile.phone || "未设置"} disabled />
          </div>
          <div className="space-y-2">
            <Label>昵称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {message && (
            <p className={`text-sm ${message.includes("成功") ? "text-green-600" : "text-destructive"}`}>
              {message}
            </p>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">修改密码</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>当前密码</Label>
            <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>新密码</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
          </div>
          {pwdMessage && (
            <p className={`text-sm ${pwdMessage.includes("成功") ? "text-green-600" : "text-destructive"}`}>
              {pwdMessage}
            </p>
          )}
          <Button onClick={handleChangePassword} disabled={changingPwd} variant="outline">
            {changingPwd ? "修改中..." : "修改密码"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">账号信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">注册时间</span>
            <span>{new Date(profile.createdAt).toLocaleString("zh-CN")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
