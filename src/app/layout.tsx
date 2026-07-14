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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={siteConfig.site.language === "zh" ? "zh-CN" : "en"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* 背景服务端渲染，避免客户端白屏 */}
        <BackgroundLayer
          type={siteConfig.background.type}
          src={siteConfig.background.src}
          blur={siteConfig.background.blur}
          overlayOpacity={siteConfig.background.overlayOpacity}
        />
        <ClientProviders>
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
