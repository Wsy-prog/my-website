"use client";

import type { ReactNode } from "react";
import { AnimationProvider } from "@/lib/animation-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { SiteDefaultsInit } from "@/components/shared/SiteDefaultsInit";

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
          <SiteDefaultsInit defaults={defaults} />
          {children}
        </ThemeProvider>
      </AnimationProvider>
    </AuthProvider>
  );
}
