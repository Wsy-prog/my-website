"use client";

import { useEffect, type ReactNode } from "react";
import { AnimationProvider } from "@/lib/animation-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { SiteDefaultsInit } from "@/components/shared/SiteDefaultsInit";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import ClickWords from "@/components/shared/ClickWords";

function ServiceWorkerRegister() {
  useEffect(() => {
    // 仅在生产环境注册 Service Worker，避免开发热重载干扰
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // 静默失败，不影响用户
        });
      }
    });
  }, []);
  return null;
}

export function ClientProviders({
  children,
  defaults,
}: {
  children: ReactNode;
  defaults: Record<string, string> | null;
}) {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <AnimationProvider>
        <ThemeProvider>
          <ServiceWorkerRegister />
          <SiteDefaultsInit defaults={defaults} />
          <ClickWords />
          {children}
        </ThemeProvider>
      </AnimationProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}
