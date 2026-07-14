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
  } catch {}
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

// 访客加载时读取管理员设定的默认值（如果没自定义过）
export function applySiteDefaults() {
  if (typeof window === "undefined") return;
  // 用户手动改过背景 → 不覆盖
  if (localStorage.getItem("bg_customized") === "true") return;

  fetch("/api/data/site_defaults")
    .then(r => r.json())
    .then(json => {
      if (json.exists && json.data) {
        for (const [k, v] of Object.entries(json.data)) {
          localStorage.setItem(k, String(v));
        }
        // 背景
        if (json.data.bg_active_src) {
          const img = document.querySelector(".bg-layer-image") as HTMLElement;
          if (img) { img.style.display = ""; img.style.backgroundImage = `url(${json.data.bg_active_src})`; }
        }
        if (json.data.bg_blur) {
          const img = document.querySelector(".bg-layer-image") as HTMLElement;
          if (img) img.style.filter = `blur(${json.data.bg_blur}px)`;
        }
        if (json.data.bg_type === "aurora") {
          const aurora = document.querySelector(".aurora-container") as HTMLElement;
          if (aurora) aurora.style.display = "";
        }
        // 主题
        if (json.data.theme === "dark") document.documentElement.classList.add("dark");
        else if (json.data.theme === "light") document.documentElement.classList.remove("dark");
        // 卡片
        if (json.data.card_theme === "clean") document.documentElement.classList.add("theme-clean");
        else document.documentElement.classList.remove("theme-clean");
      }
    })
    .catch(() => {});
}
