export async function syncSiteDefaults(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const defaults: Record<string, any> = {};
  const keys = ["bg_type", "bg_blur", "bg_opacity", "bg_active_src", "theme", "card_theme"];
  const defaults_fallback: Record<string, string> = { bg_type: "aurora", bg_blur: "0", bg_opacity: "0.3", theme: "", card_theme: "glass" };
  for (const k of keys) {
    const v = localStorage.getItem(k) || defaults_fallback[k] || "";
    if (!v) continue;
    // "none" 是 SettingsPanel mount 污染产生的脏值，不应同步到数据库让全站背景消失
    if (k === "bg_type" && v === "none") continue;
    defaults[k] = v;
  }
  try {
    const assets = JSON.parse(localStorage.getItem("bg_assets") || "[]");
    const activeSrc = localStorage.getItem("bg_active_src");
    if (activeSrc && assets.length) { const match = assets.find((a: any) => a.src === activeSrc); if (match) defaults.bg_active_name = match.name; }
  } catch { console.warn("site-defaults: JSON parse failed"); }
  const token = localStorage.getItem("admin_token");
  try {
    const res = await fetch("/api/data/site_defaults", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ data: defaults }) });
    return res.ok;
  } catch { return false; }
}

// 由 SiteDefaultsInit 组件在 SSR 阶段完成，applySiteDefaults 已移除