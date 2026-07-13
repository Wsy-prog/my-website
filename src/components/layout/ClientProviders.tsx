"use client";

import type { ReactNode } from "react";
import { AnimationProvider } from "@/lib/animation-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { SiteDefaultsInit } from "@/components/shared/SiteDefaultsInit";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AnimationProvider>
        <ThemeProvider>
          <SiteDefaultsInit />
          {children}
        </ThemeProvider>
      </AnimationProvider>
    </AuthProvider>
  );
}
