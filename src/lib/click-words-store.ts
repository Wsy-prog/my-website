const STORAGE_KEY = "click_words_settings";

export interface ClickWordsSettings {
  words: string[];
  duration: number; // ms
  color: string;    // CSS gradient value
}

export const COLOR_PRESETS = [
  { label: "紫→粉→青", value: "linear-gradient(135deg, #a855f7, #ec4899, #06b6d4)" },
  { label: "紫→青",     value: "linear-gradient(135deg, #a855f7, #06b6d4)" },
  { label: "紫→靛蓝",   value: "linear-gradient(135deg, #a855f7, #6366f1)" },
  { label: "青→蓝",     value: "linear-gradient(135deg, #06b6d4, #3b82f6)" },
  { label: "粉→琥珀",   value: "linear-gradient(135deg, #f472b6, #f59e0b)" },
  { label: "紫→品红",   value: "linear-gradient(135deg, #a855f7, #c026d3)" },
  { label: "纯紫",      value: "linear-gradient(135deg, #a855f7, #a855f7)" },
  { label: "纯青",      value: "linear-gradient(135deg, #06b6d4, #06b6d4)" },
  { label: "绿→青",     value: "linear-gradient(135deg, #22c55e, #06b6d4)" },
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
}

/** Merge from API (admin use) */
export function mergeClickWordsFromApi(data: any): ClickWordsSettings | null {
  if (!data) return null;
  const merged = { ...DEFAULT_SETTINGS };
  if (Array.isArray(data.words) && data.words.length > 0) merged.words = data.words;
  if (typeof data.duration === "number") merged.duration = data.duration;
  return merged;
}
