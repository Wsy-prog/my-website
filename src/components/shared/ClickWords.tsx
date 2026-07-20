"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadClickWordsSettings, syncClickWordsFromApi, DEFAULT_SETTINGS, type ClickWordsSettings } from "@/lib/click-words-store";

export default function ClickWords() {
  const [settings, setSettings] = useState<ClickWordsSettings>(DEFAULT_SETTINGS);
  const [ripple, setRipple] = useState<{ id: number; word: string; x: number; y: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const indexRef = useRef(0);
  const idRef = useRef(0);
  const settingsRef = useRef<ClickWordsSettings>(DEFAULT_SETTINGS);
  const clickTargetRef = useRef<Element | null>(null);

  // keep ref in sync
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // load settings on mount + sync from API
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
      setLoaded(true);
    };
    init();
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

  // pointerdown 更底层，在所有事件之前触发
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (target instanceof Element) {
        clickTargetRef.current = target;
        // 如果目标或祖先有关注能力，标记跳过
        let node: Element | null = target;
        while (node) {
          if (node.getAttribute?.("data-cw-ignore")) {
            clickTargetRef.current = null;
            return;
          }
          node = node.parentElement;
        }
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  // mousedown 备选
  useEffect(() => {
    const onMousedown = (e: MouseEvent) => {
      clickTargetRef.current = e.target instanceof Element ? e.target : null;
    };
    document.addEventListener("mousedown", onMousedown, true);
    return () => document.removeEventListener("mousedown", onMousedown, true);
  }, []);

  const isFocusable = useCallback((el: Element): boolean => {
    if (el.getAttribute?.("data-cw-ignore")) return true;
    const tag = el.tagName.toLowerCase();
    if (["input", "textarea", "select", "button", "a"].includes(tag)) return true;
    if (el instanceof HTMLElement && el.isContentEditable) return true;
    if (el.getAttribute?.("data-slot") || el.getAttribute?.("contenteditable")) return true;
    return false;
  }, []);

  // 通过指针坐标判断是否在交互元素区域
  function isOverFocusable(x: number, y: number): boolean {
    try {
      const el = document.elementFromPoint(x, y);
      if (!el) return false;
      let node = el instanceof Element ? el : null;
      while (node) {
        if (isFocusable(node)) return true;
        node = node.parentElement;
      }
    } catch { /* ignore */ }
    return false;
  }

  const handleClick = useCallback((e: MouseEvent) => {
    // 1) 检查点击坐标下方的元素（elementFromPoint 最准确）
    if (isOverFocusable(e.clientX, e.clientY)) return;

    // 2) 检查当前焦点
    const active = document.activeElement;
    if (active && active !== document.body) {
      if (active.getAttribute?.("data-cw-ignore") || active.getAttribute?.("data-slot")) return;
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
  }, [isFocusable]);

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
