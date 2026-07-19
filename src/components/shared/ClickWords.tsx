"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadClickWordsSettings, DEFAULT_SETTINGS, type ClickWordsSettings } from "@/lib/click-words-store";

function isInteractive(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (["a", "button", "input", "textarea", "select", "label", "svg", "path"].includes(tag)) return true;
  if (el.getAttribute("role") && /button|link|dialog|tab|menuitem|option/i.test(el.getAttribute("role")!)) return true;
  if (el.closest("button, a, input, textarea, select, [role='button'], [role='link'], [role='dialog'], [role='tab'], .cursor-pointer, [data-slot], [data-sidebar], [data-state]")) return true;
  if (el.closest("[data-radix-popper-content-wrapper], [data-radix-portal]")) return true;
  return false;
}

export default function ClickWords() {
  const [settings, setSettings] = useState<ClickWordsSettings>(DEFAULT_SETTINGS);
  const [ripple, setRipple] = useState<{ id: number; word: string; x: number; y: number } | null>(null);
  const indexRef = useRef(0);
  const idRef = useRef(0);
  const settingsRef = useRef<ClickWordsSettings>(DEFAULT_SETTINGS);

  // keep ref in sync
  settingsRef.current = settings;

  // load settings on mount
  useEffect(() => {
    const loaded = loadClickWordsSettings();
    setSettings(loaded);
    settingsRef.current = loaded;
  }, []);

  // listen for settings changes from settings panel
  useEffect(() => {
    const handler = () => {
      const updated = loadClickWordsSettings();
      setSettings(updated);
      settingsRef.current = updated;
    };
    window.addEventListener("click-words-settings-changed", handler);
    return () => window.removeEventListener("click-words-settings-changed", handler);
  }, []);

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (isInteractive(target)) return;

    const s = settingsRef.current;
    if (s.words.length === 0) return;

    const word = s.words[indexRef.current % s.words.length];
    indexRef.current = (indexRef.current + 1) % s.words.length;

    const id = idRef.current++;
    setRipple({ id, word, x: e.clientX, y: e.clientY });

    setTimeout(() => {
      setRipple((prev) => (prev?.id === id ? null : prev));
    }, s.duration);
  }, []);

  useEffect(() => {
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [handleClick]);

  return (
    <AnimatePresence>
      {ripple && (
        <motion.span
          key={ripple.id}
          initial={{ opacity: 0, scale: 0.4, y: 0 }}
          animate={{ opacity: 0.7, scale: 1, y: -16 }}
          exit={{ opacity: 0, scale: 1.1, y: -36 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed font-medium text-sm sm:text-base pointer-events-none select-none whitespace-nowrap z-[9999]"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: "translate(-50%, -50%)",
            background: settings.color,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {ripple.word}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
