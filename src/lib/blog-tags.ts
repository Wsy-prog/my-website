// 博客标签工具 —— 自定义标签同步到 localStorage
// 地点标签来自 travel-store，此处只管理用户自定义标签

const CUSTOM_TAGS_KEY = "blog_custom_tags";

export function loadCustomTags(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CUSTOM_TAGS_KEY) || "[]"); } catch { return []; }
}

export function saveCustomTags(tags: string[]) {
  localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(tags));
  // 异步同步到 API
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("admin_token");
    fetch("/api/data/blog_custom_tags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data: tags }),
    }).catch(() => {});
  }
}

/** 获取所有可选标签（地点标签 + 自定义标签，统一排序） */
export function getAllTags(locationTags: string[]): string[] {
  return [...new Set([...locationTags, ...loadCustomTags()])].sort((a, b) => a.localeCompare(b, "zh"));
}
