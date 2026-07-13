"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AnimationContextType {
  enabled: boolean;
  toggle: () => void;
}

const AnimationContext = createContext<AnimationContextType>({ enabled: true, toggle: () => {} });

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("scroll_animations_enabled");
    if (stored !== null) {
      setEnabled(stored === "true");
    }
  }, []);

  const toggle = () => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("scroll_animations_enabled", String(next));
      return next;
    });
  };

  return (
    <AnimationContext.Provider value={{ enabled, toggle }}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  return useContext(AnimationContext);
}
