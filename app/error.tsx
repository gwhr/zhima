"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-3xl font-bold mb-2">出错了</h1>
      <p className="text-muted-foreground mb-6">页面发生了意外错误</p>
      <Button onClick={reset}>重试</Button>
    </div>
  );
}
