import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "智码 ZhiMa - 毕设辅导与开发助手",
  description:
    "面向毕业设计的辅导平台，提供需求拆解、代码示例和论文写作参考，辅助你独立完成项目。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
