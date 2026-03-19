import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <ShieldX className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-3xl font-bold mb-2">403</h1>
      <p className="text-muted-foreground mb-6">你没有权限访问此页面</p>
      <Button asChild>
        <Link href="/dashboard">返回仪表盘</Link>
      </Button>
    </div>
  );
}
