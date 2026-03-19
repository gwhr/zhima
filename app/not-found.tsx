import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
      <h1 className="text-3xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">页面不存在</p>
      <Button asChild>
        <Link href="/">返回首页</Link>
      </Button>
    </div>
  );
}
