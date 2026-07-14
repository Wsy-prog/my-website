"use client";

import { useEffect } from "react";

export function SiteDefaultsInit({ defaults }: { defaults: Record<string, string> | null }) {
  useEffect(() => {
    if (typeof window === "undefined" || !defaults) return;
    // 用户手动改过背景或主题 → 不覆盖
    if (localStorage.getItem("bg_customized") === "true") return;

    // 将 API 默认值填充到 localStorage（管理员更新后会同步覆盖）
    const keys = ["bg_type", "bg_active_src", "bg_blur", "bg_opacity", "theme", "card_theme"];
    for (const k of keys) {
      if (defaults[k]) {
        localStorage.setItem(k, String(defaults[k]));
      }
    }
  }, [defaults]);

  return null;
}
