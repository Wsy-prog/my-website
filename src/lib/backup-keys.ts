// 备份/恢复统一 key 清单。导出/恢复/允许写入校验全部引用这里，避免多份硬编码漂移。

// 只在 localStorage 的设置/状态（无需进数据库）。导出从 localStorage 读，恢复写 localStorage。
export const LOCAL_ONLY_KEYS = [
  "blog_custom_tags",
  "bg_type",
  "bg_blur",
  "bg_opacity",
  "bg_active_src",
  "bg_customized",
  "bg_synced_version",
  "guestbook_liked",
  "guestbook_visited",
  "guestbook_visitor_count",
  "card_theme",
  "theme",
  "scroll_animations_enabled",
  "blog_comment_liked",
  "blog_autosave_enabled",
  "click_words_settings",
  "lyrics_settings",
  "gallery_deleted_defaults",
  // 旅行标记：store 不接 API，仅本浏览器（恢复后仅当前设备可见）
  "travel_all_markers",
  "travel_markers_version",
];

// 在数据库里有权威副本的 key。导出从 API 读，恢复时写 API（部分同时写本地缓存）。
export const DB_KEYS = [
  "blog_custom_posts",
  "gallery_photos",
  "music_tracks",
  "bg_assets",
  "guestbook_messages",
  "site_defaults",
  "contact_messages",
];

// 既存 localStorage 缓存、又存 DB 的 key。恢复时本地缓存 + API 都写，让本机立即生效。
export const DB_KEYS_WITH_LOCAL_CACHE = [
  "blog_custom_posts",
  "gallery_photos",
  "music_tracks",
  "bg_assets",
  "guestbook_messages",
];

export const COMMENT_PREFIX = "blog_comments_";
// 评论索引 key（记录哪些文章有评论），本地唯一源，单独备份/恢复。
export const COMMENT_INDEX_KEY = "blog_comments_slugs";
// 历史遗留的聚合 key，不备份。
export const COMMENT_LEGACY_KEYS = ["blog_comments_slugs", "blog_comments_all"];

/** 判断 key 是否为某文章的评论数据（排除索引/聚合 key） */
export function isCommentDataKey(key: string): boolean {
  return key.startsWith(COMMENT_PREFIX) && !COMMENT_LEGACY_KEYS.includes(key);
}

/** 恢复时允许写入 localStorage 的 key 集合（白名单，防注入未知 key） */
export function isAllowedLocalKey(key: string): boolean {
  if (LOCAL_ONLY_KEYS.includes(key)) return true;
  if (DB_KEYS_WITH_LOCAL_CACHE.includes(key)) return true;
  if (key === "site_defaults") return true; // site_defaults 也写本地，恢复后本机默认外观立即生效
  if (key === COMMENT_INDEX_KEY) return true;
  if (isCommentDataKey(key)) return true;
  return false;
}
