"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadClickWordsSettings, syncClickWordsFromApi, DEFAULT_SETTINGS, type ClickWordsSettings } from "@/lib/click-words-store";

function isInteractive(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  const tag = el.tagName.toLowerCase();

  // 原生交互元素
  if (["a", "button", "input", "textarea", "select", "label", "svg", "path", "details", "summary"].includes(tag)) return true;

  // 可编辑区域（contentEditable / 富文本编辑器）
  if (el instanceof HTMLElement && (el.isContentEditable || el.getAttribute("contenteditable") === "true")) return true;

  // role 属性
  const role = el.getAttribute("role");
  if (role && /button|link|dialog|tab|menuitem|option|textbox|combobox|searchbox|slider/.test(role)) return true;

  return false;
}

export default function ClickWords() {
  const [settings, setSettings] = useState<ClickWordsSettings>(DEFAULT_SETTINGS);
  const [ripple, setRipple] = useState<{ id: number; word: string; x: number; y: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const indexRef = useRef(0);
  const idRef = useRef(0);
  const settingsRef = useRef<ClickWordsSettings>(DEFAULT_SETTINGS);

  // keep ref in sync
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // load settings on mount + sync from API
  useEffect(() => {
    const init = async () => {
      // 先加载本地
      const local = loadClickWordsSettings();
      setSettings(local);
      settingsRef.current = local;
      // 再从 API 同步（覆盖本地，实现跨设备同步）
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

  const handleClick = useCallback((e: MouseEvent) => {
    // ===== 兜底检查：点击后焦点是否落在表单控件上（最可靠） =====
    const active = document.activeElement;
    if (active && active !== document.body) {
      const activeTag = active.tagName;
      if (activeTag === "TEXTAREA" || activeTag === "INPUT" || activeTag === "SELECT") return;
      if (active instanceof HTMLElement && (active.isContentEditable || active.getAttribute?.("contenteditable"))) return;
      if (active.getAttribute?.("data-slot")) return;
    }

    // ===== 从点击目标向上遍历 DOM 树 =====
    let node: Element | null = e.target as Element | null;
    while (node) {
      if (isInteractive(node)) return;
      if (node.getAttribute?.("data-slot") || node.getAttribute?.("contenteditable")) return;
      node = node.parentElement;
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
