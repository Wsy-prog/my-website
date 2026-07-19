import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { BackgroundLayer } from "@/components/layout/BackgroundLayer";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { ClientProviders } from "@/components/layout/ClientProviders";
import { MusicPlayer } from "@/components/music/MusicPlayer";
import { BackToTop } from "@/components/shared/BackToTop";
import { siteConfig } from "@/lib/config";
import { loadData } from "@/lib/db";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

async function getSiteDefaults() {
  try {
    const result = await loadData<Record<string, string>>("site_defaults");
    if (result.exists && result.data) return result.data;
  } catch { /* 数据库不可用时回退到 config.json */ }
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
