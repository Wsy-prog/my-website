"use client";

import { useEffect } from "react";

// 将服务端 site_defaults 同步到访客 localStorage。
// 用 _version 版本戳判断：管理员更新默认外观后 version 变化，所有访客（含自己调过的）
// 下次访问都会被更新成新默认。访客的临时调整只在"管理员尚未更新默认"期间保留。
export function SiteDefaultsInit({ defaults: _ssrDefaults }: { defaults: Record<string, string> | null }) {
  useEffect(() => {
    fetch("/api/data/site_defaults")
      .then((r) => r.json())
      .then((json) => {
        if (!json.exists || !json.data) return;
        const d = json.data as Record<string, any>;
        const serverVersion = typeof d._version === "number" ? String(d._version) : "";
        const syncedVersion = localStorage.getItem("bg_synced_version") || "";

        // 版本未变且已有同步记录 → 无需更新（避免覆盖访客本次会话的临时调整）
        if (serverVersion && syncedVersion === serverVersion) return;

        const keys = ["bg_type", "bg_blur", "bg_opacity", "bg_active_src", "theme", "card_theme"];
        for (const k of keys) {
          if (d[k] !== undefined && d[k] !== "") {
            localStorage.setItem(k, String(d[k]));
          }
        }
        if (serverVersion) localStorage.setItem("bg_synced_version", serverVersion);
        // 清除"已自定义"标记：管理员的新默认应覆盖访客旧自定义
        localStorage.removeItem("bg_customized");

        // 应用主题/卡片样式到 <html>
        if (d.theme === "dark") document.documentElement.classList.add("dark");
        else if (d.theme === "light") document.documentElement.classList.remove("dark");
        if (d.card_theme === "clean") document.documentElement.classList.add("theme-clean");
        else document.documentElement.classList.remove("theme-clean");

        window.dispatchEvent(new Event("site-defaults-applied"));
      })
      .catch(() => {});
  }, []);

  return null;
}
