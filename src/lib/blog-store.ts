import type { BlogPost } from "@/data/blog-posts";

const CUSTOM_POSTS_KEY = "blog_custom_posts";

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
  };
}

/** 从服务端加载博客文章（异步，权威数据源） */
export async function loadFromApi(): Promise<BlogPost[]> {
  try {
    const res = await fetch("/api/data/blog_custom_posts");
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) {
      return json.data.map(sanitizePost);
    }
  } catch { /* 网络错误 */ }
  return [];
}

/** 同步到服务端 */
async function saveToApi(posts: BlogPost[]) {
  try {
    await fetch("/api/data/blog_custom_posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: posts }),
    });
  } catch { /* 静默 */ }
}

// ========== 本地缓存（加速二次加载） ==========

function loadCache(): BlogPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_POSTS_KEY);
    return raw ? JSON.parse(raw).map(sanitizePost) : [];
  } catch { return []; }
}

function saveCache(posts: BlogPost[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(CUSTOM_POSTS_KEY, JSON.stringify(posts)); } catch {}
}

// ========== 公开方法 ==========

/** 获取所有文章：先读缓存（即时显示），再从 API 拉取最新数据 */
export function loadCustomPosts(): BlogPost[] {
  return loadCache();
}

export async function loadCustomPostsServer(): Promise<BlogPost[]> {
  const posts = await loadFromApi();
  saveCache(posts);
  return posts;
}

export function saveCustomPost(post: BlogPost) {
  const posts = loadCache();
  const idx = posts.findIndex((p) => p.slug === post.slug);
  if (idx >= 0) {
    posts[idx] = post;
  } else {
    posts.unshift(post);
  }
  saveCache(posts);
  saveToApi(posts);
}

export function deleteCustomPost(slug: string) {
  const posts = loadCache().filter((p) => p.slug !== slug);
  saveCache(posts);
  saveToApi(posts);
}

export function getAllPosts(staticPosts: BlogPost[]): BlogPost[] {
  const custom = loadCache();
  return [...custom, ...staticPosts];
}

export function getPostBySlug(slug: string): BlogPost | null {
  const posts = loadCache();
  return posts.find((p) => p.slug === slug) || null;
}
