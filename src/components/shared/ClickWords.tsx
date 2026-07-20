"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadClickWordsSettings, syncClickWordsFromApi, DEFAULT_SETTINGS, type ClickWordsSettings } from "@/lib/click-words-store";

export default function ClickWords() {
  const [settings, setSettings] = useState<ClickWordsSettings>(DEFAULT_SETTINGS);
  const [ripple, setRipple] = useState<{ id: number; word: string; x: number; y: number } | null>(null);
  const indexRef = useRef(0);
  const idRef = useRef(0);
  const settingsRef = useRef<ClickWordsSettings>(DEFAULT_SETTINGS);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    const init = async () => {
      const local = loadClickWordsSettings();
      setSettings(local);
      settingsRef.current = local;
      const remote = await syncClickWordsFromApi();
      if (remote) { setSettings(remote); settingsRef.current = remote; }
    };
    init();
  }, []);

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
    // 检查事件路径(e.composedPath)中的每一个节点，看是否有表单控件
    const path = e.composedPath?.() || [];
    for (const el of path) {
      if (el instanceof Element || el instanceof ShadowRoot) {
        const node = el instanceof ShadowRoot ? el.host : el;
        const tag = node.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
        if (tag === "FORM") return;
        if (node.hasAttribute?.("contenteditable") || node.hasAttribute?.("data-slot")) return;
      }
    }

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
          className="fixed font-medium text-sm sm:text-base pointer-events-none select-none whitespace-nowrap z-50"
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