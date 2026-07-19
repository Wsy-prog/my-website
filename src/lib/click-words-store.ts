const STORAGE_KEY = "click_words_settings";

export interface ClickWordsSettings {
  words: string[];
  duration: number; // ms
  color: string;    // CSS gradient value
}

export interface ColorPreset {
  label: string;
  value: string;      // gradient
  solidColor: string; // first hex color from gradient
}

export const COLOR_PRESETS: ColorPreset[] = [
  { label: "紫→粉→青", value: "linear-gradient(135deg, #a855f7, #ec4899, #06b6d4)", solidColor: "#a855f7" },
  { label: "紫→青",     value: "linear-gradient(135deg, #a855f7, #06b6d4)",           solidColor: "#06b6d4" },
  { label: "紫→靛蓝",   value: "linear-gradient(135deg, #a855f7, #6366f1)",           solidColor: "#6366f1" },
  { label: "青→蓝",     value: "linear-gradient(135deg, #06b6d4, #3b82f6)",           solidColor: "#3b82f6" },
  { label: "粉→琥珀",   value: "linear-gradient(135deg, #f472b6, #f59e0b)",           solidColor: "#f472b6" },
  { label: "紫→品红",   value: "linear-gradient(135deg, #a855f7, #c026d3)",           solidColor: "#c026d3" },
  { label: "纯紫",      value: "linear-gradient(135deg, #a855f7, #a855f7)",           solidColor: "#a855f7" },
  { label: "纯青",      value: "linear-gradient(135deg, #06b6d4, #06b6d4)",           solidColor: "#06b6d4" },
  { label: "绿→青",     value: "linear-gradient(135deg, #22c55e, #06b6d4)",           solidColor: "#22c55e" },
];

export const DEFAULT_SETTINGS: ClickWordsSettings = {
  words: ["Born", "to", "be", "fantastic"],
  duration: 1000,
  color: COLOR_PRESETS[0].value,
};

export function loadClickWordsSettings(): ClickWordsSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        words: Array.isArray(parsed.words) && parsed.words.length > 0 ? parsed.words : DEFAULT_SETTINGS.words,
        duration: typeof parsed.duration === "number" && parsed.duration >= 200 ? parsed.duration : DEFAULT_SETTINGS.duration,
        color: typeof parsed.color === "string" && parsed.color ? parsed.color : DEFAULT_SETTINGS.color,
      };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveClickWordsSettings(settings: ClickWordsSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  // 同步到 API（管理员才能写入）
  const token = localStorage.getItem("admin_token");
  fetch("/api/data/click_words_settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ data: settings }),
  }).catch(() => {});
}

/** 从 API 加载设置，合并到 localStorage */
export async function syncClickWordsFromApi(): Promise<ClickWordsSettings | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/data/click_words_settings");
    const json = await res.json();
    if (json.exists && json.data) {
      const merged = mergeClickWordsFromApi(json.data);
      if (merged) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch {}
  return null;
}

/** Merge from API (admin use) */
export function mergeClickWordsFromApi(data: any): ClickWordsSettings | null {
  if (!data) return null;
  const merged = { ...DEFAULT_SETTINGS };
  if (Array.isArray(data.words) && data.words.length > 0) merged.words = data.words;
  if (typeof data.duration === "number") merged.duration = data.duration;
  if (typeof data.color === "string" && data.color) merged.color = data.color;
  return merged;
}
