import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { BackgroundLayer } from "@/components/layout/BackgroundLayer";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { ClientProviders } from "@/components/layout/ClientProviders";
import { MusicPlayer } from "@/components/music/MusicPlayer";
import { BackToTop } from "@/components/shared/BackToTop";
import { siteConfig } from "@/lib/config";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${siteConfig.site.title} | ${siteConfig.site.name}`,
  description: siteConfig.site.description,
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
};

async function getSiteDefaults() {
  try {
    // 使用本地完整 URL 或 Vercel 部署 URL 访问 API
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${base}/api/data/site_defaults`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (json.exists && json.data) return json.data as Record<string, string>;
  } catch { /* 使用 config.json 回退 */ }
  return null;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const defaults = await getSiteDefaults();

  const bgType = (defaults?.bg_type || siteConfig.background.type) as "image" | "video" | "aurora" | "none";
  const bgSrc = defaults?.bg_active_src || siteConfig.background.src;
  const bgBlur = defaults?.bg_blur ? parseFloat(defaults.bg_blur) : siteConfig.background.blur;
  const bgOpacity = defaults?.bg_opacity ? parseFloat(defaults.bg_opacity) : siteConfig.background.overlayOpacity;
  const theme = defaults?.theme || "";
  const cardTheme = defaults?.card_theme || "glass";

  return (
    <html
      lang={siteConfig.site.language === "zh" ? "zh-CN" : "en"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${theme === "dark" ? "dark" : ""} ${cardTheme === "clean" ? "theme-clean" : ""}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* 背景服务端渲染：用 API 默认值或 config.json 回退 */}
        <BackgroundLayer
          type={bgType}
          src={bgSrc}
          blur={bgBlur}
          overlayOpacity={bgOpacity}
        />
        <ClientProviders defaults={defaults}>
          <Navbar />
          <main className="flex-1 pt-16">
            {children}
          </main>
          <SettingsPanel />
          <BackToTop />
          <MusicPlayer />
        </ClientProviders>
      </body>
    </html>
  );
}
