"use client";

import { useEffect, type ReactNode } from "react";
import { AnimationProvider } from "@/lib/animation-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { SiteDefaultsInit } from "@/components/shared/SiteDefaultsInit";

function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 静默失败，不影响用户
      });
    }
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
    <AuthProvider>
      <AnimationProvider>
        <ThemeProvider>
          <ServiceWorkerRegister />
          <SiteDefaultsInit defaults={defaults} />
          {children}
        </ThemeProvider>
      </AnimationProvider>
    </AuthProvider>
  );
}
