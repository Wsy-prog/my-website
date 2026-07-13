"use client";

import type { ReactNode } from "react";
import { AnimationProvider } from "@/lib/animation-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AnimationProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AnimationProvider>
    </AuthProvider>
  );
}
