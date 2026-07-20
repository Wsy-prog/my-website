import type { BlogPost } from "@/data/blog-posts";

const CUSTOM_POSTS_KEY = "blog_custom_posts";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem("admin_token"); } catch { return null; }
}

function sanitizePost(p: Partial<BlogPost>): BlogPost {
  return {
    slug: p.slug || "",
    title: p.title || "",
    date: p.date || "",
    readTime: p.readTime || "1 分钟",
    category: p.category || "life",
    tags: Array.isArray(p.tags) ? p.tags : [],
    summary: p.summary || "",
    content: p.content || "",
    coverImage: p.coverImage || undefined,
    coverPosition: p.coverPosition ?? undefined,
    commentsEnabled: p.commentsEnabled !== false,
    draft: p.draft === true,
  };
}

/** 从服务端加载博客文章（异步，权威数据源） */
export async function loadFromApi(): Promise<BlogPost[]> {
  try {
    const res = await fetch("/api/data/blog_custom_posts");
    if (!res.ok) return [];
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) {
      return json.data.map(sanitizePost);
    }
  } catch { console.warn("blog-store: API fetch failed"); }
  return [];
}

/** 同步到服务端 — 返回是否成功 */
async function saveToApi(posts: BlogPost[]): Promise<boolean> {
  try {
    const token = getToken();
    const res = await fetch("/api/data/blog_custom_posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data: posts }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ========== 本地缓存（加速二次加载） ==========

function loadCache(): BlogPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_POSTS_KEY);
    return raw ? JSON.parse(raw).map(sanitizePost) : [];
  } catch { console.warn("blog-store: API fetch failed"); return []; }
}

function saveCache(posts: BlogPost[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(CUSTOM_POSTS_KEY, JSON.stringify(posts)); } catch {}
}

// ========== 公开方法 ==========

// 序列化锁：防止并发保存条件竞争
let saveQueue: Promise<any> = Promise.resolve();

function serializedSave(fn: () => Promise<{ ok: boolean }>): Promise<{ ok: boolean }> {
  saveQueue = saveQueue.then(fn, () => ({ ok: false }));
  return saveQueue;
}

/** 获取所有文章：读 localStorage 缓存 */
export function loadCustomPosts(): BlogPost[] {
  return loadCache();
}

/** 从服务端拉取最新文章数组并更新缓存 */
export async function loadCustomPostsServer(): Promise<BlogPost[]> {
  const posts = await loadFromApi();
  if (posts.length > 0) {
    saveCache(posts);
  }
  return posts;
}

/**
 * 保存文章：先写 localStorage（即时），再同步到 API（await）。
 * 返回 { ok: boolean }，调用方可选择是否给用户反馈。
 */
export async function saveCustomPost(post: BlogPost): Promise<{ ok: boolean }> {
  return serializedSave(async () => {
    const posts = loadCache();
    const idx = posts.findIndex((p) => p.slug === post.slug);
    if (idx >= 0) {
      posts[idx] = post;
    } else {
      posts.unshift(post);
    }
    saveCache(posts);
    const ok = await saveToApi(posts);
    return { ok };
  });
}

/** 删除文章：本地 + API */
export async function deleteCustomPost(slug: string): Promise<{ ok: boolean }> {
  return serializedSave(async () => {
    const posts = loadCache().filter((p) => p.slug !== slug);
    saveCache(posts);
    const ok = await saveToApi(posts);
    return { ok };
  });
}

/** 合并静态文章 + 本地缓存文章 */
export function getAllPosts(staticPosts: BlogPost[]): BlogPost[] {
  const custom = loadCache();
  return [...custom, ...staticPosts];
}

/** 从本地缓存按 slug 查文章 */
export function getPostBySlug(slug: string): BlogPost | null {
  const posts = loadCache();
  return posts.find((p) => p.slug === slug) || null;
}
