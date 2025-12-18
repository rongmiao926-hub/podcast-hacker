import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "小鲁宙",
  description: "实时语音采访 · 逐字字幕 · 结构整理 · 一键导出播客成品"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body
  style={{
    margin: 0,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
    color: "#1d1d1f",
    background: "#F5F5F7",
  }}
>
  {children}
</body>

    </html>
  );
}
