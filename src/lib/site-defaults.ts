// 管理员同步外观设置为站点默认值
export async function syncSiteDefaults(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const defaults: Record<string, any> = {};
  // 始终包含所有关键值（用当前状态填充）
  const keys = ["bg_type", "bg_blur", "bg_opacity", "bg_active_src", "theme", "card_theme"];
  const defaults_fallback: Record<string, string> = {
    bg_type: "aurora",
    bg_blur: "0",
    bg_opacity: "0.3",
    theme: "",
    card_theme: "glass",
  };
  for (const k of keys) {
    const v = localStorage.getItem(k) || defaults_fallback[k] || "";
    if (v) defaults[k] = v;
  }
  // 同时保存当前激活背景的名称
  try {
    const assets = JSON.parse(localStorage.getItem("bg_assets") || "[]");
    const activeSrc = localStorage.getItem("bg_active_src");
    if (activeSrc && assets.length) {
      const match = assets.find((a: any) => a.src === activeSrc);
      if (match) defaults.bg_active_name = match.name;
    }
  } catch { console.warn("site-defaults: JSON parse failed"); }
  const token = localStorage.getItem("admin_token");
  try {
    const res = await fetch("/api/data/site_defaults", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ data: defaults }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 访客加载时读取管理员设定的默认值 — 由 SiteDefaultsInit 组件在 SSR 阶段完成
// SiteDefaultsInit 接收 layout.tsx 直接从数据库读取的 site_defaults，写入 localStorage
// 不再使用客户端自请求 API 的方式（已被 SiteDefaultsInit 替代）
