"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type CardTheme = "glass" | "clean";

interface ThemeContextType {
  cardTheme: CardTheme;
  setCardTheme: (t: CardTheme) => void;
  toggleCardTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  cardTheme: "glass",
  setCardTheme: () => {},
  toggleCardTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [cardTheme, setCardThemeState] = useState<CardTheme>("glass");

  useEffect(() => {
    const stored = localStorage.getItem("card_theme") as CardTheme | null;
    if (stored === "glass" || stored === "clean") {
      setCardThemeState(stored);
      if (stored === "clean") document.documentElement.classList.add("theme-clean");
    }
  }, []);

  const setCardTheme = (t: CardTheme) => {
    setCardThemeState(t);
    localStorage.setItem("card_theme", t);
    if (t === "clean") {
      document.documentElement.classList.add("theme-clean");
    } else {
      document.documentElement.classList.remove("theme-clean");
    }
  };

  const toggleCardTheme = () => {
    setCardTheme(cardTheme === "glass" ? "clean" : "glass");
  };

  return (
    <ThemeContext.Provider value={{ cardTheme, setCardTheme, toggleCardTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useCardTheme() {
  return useContext(ThemeContext);
}
