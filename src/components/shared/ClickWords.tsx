"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadClickWordsSettings, syncClickWordsFromApi, DEFAULT_SETTINGS, type ClickWordsSettings } from "@/lib/click-words-store";

/**
 * 在 mousedown 阶段（capture，先于一切）检查目标是否可聚焦。
 * 如果可聚焦，click 事件中跳过特效，避免 React state 更新抢走焦点。
 */
function isFocusableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  // 自身上检查
  if (el.getAttribute?.("data-cw-ignore") === "true") return true;
  const tag = el.tagName.toLowerCase();
  if (["input", "textarea", "select", "button", "a"].includes(tag)) return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  if (el.getAttribute?.("data-slot") || el.getAttribute?.("contenteditable")) return true;
  // 祖先链检查
  if (el.closest?.("textarea, input, select, button, a, [data-slot], [contenteditable], [data-cw-ignore]")) return true;
  return false;
}

export default function ClickWords() {
  const [settings, setSettings] = useState<ClickWordsSettings>(DEFAULT_SETTINGS);
  const [ripple, setRipple] = useState<{ id: number; word: string; x: number; y: number } | null>(null);
  const indexRef = useRef(0);
  const idRef = useRef(0);
  const settingsRef = useRef<ClickWordsSettings>(DEFAULT_SETTINGS);
  const skipNextRef = useRef(false);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    const init = async () => {
      const local = loadClickWordsSettings();
      setSettings(local);
      settingsRef.current = local;
      const remote = await syncClickWordsFromApi();
      if (remote) {
        setSettings(remote);
        settingsRef.current = remote;
      }
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

  // mousedown (capture) — 先于 React 事件系统，决定是否跳过后续 click
  useEffect(() => {
    const onMousedown = (e: MouseEvent) => {
      skipNextRef.current = isFocusableTarget(e.target);
    };
    document.addEventListener("mousedown", onMousedown, true);
    return () => document.removeEventListener("mousedown", onMousedown, true);
  }, []);

  const handleClick = useCallback((e: MouseEvent) => {
    // 如果在 mousedown 阶段已判定为可聚焦元素，跳过特效
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
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