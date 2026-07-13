import type { BlogPost } from "@/data/blog-posts";

const CUSTOM_POSTS_KEY = "blog_custom_posts";
const TOKEN_KEY = "admin_token";

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
  };
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// ========== 从服务端加载 ==========

export async function loadCustomPostsServer(): Promise<BlogPost[]> {
  try {
    const res = await fetch("/api/data/blog_custom_posts");
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) {
      return json.data.map(sanitizePost);
    }
  } catch { /* 网络错误，使用本地数据 */ }
  return [];
}

/** 客户端使用的同步加载（从 localStorage 缓存读取） */
export function loadCustomPosts(): BlogPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(sanitizePost) : [];
  } catch {
    return [];
  }
}

// ========== 保存 / 删除 ==========

async function syncToApi(posts: BlogPost[]) {
  const token = getToken();
  try {
    await fetch("/api/data/blog_custom_posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data: posts }),
    });
  } catch { /* 后台静默 */ }
}

export function saveCustomPost(post: BlogPost) {
  const posts = loadCustomPosts();
  const idx = posts.findIndex((p) => p.slug === post.slug);
  if (idx >= 0) {
    posts[idx] = post;
  } else {
    posts.unshift(post);
  }
  try {
    localStorage.setItem(CUSTOM_POSTS_KEY, JSON.stringify(posts));
    syncToApi(posts);
  } catch (e) {
    console.error("[blog-store] save failed:", e);
  }
}

export function deleteCustomPost(slug: string) {
  const posts = loadCustomPosts().filter((p) => p.slug !== slug);
  try {
    localStorage.setItem(CUSTOM_POSTS_KEY, JSON.stringify(posts));
    syncToApi(posts);
  } catch (e) {
    console.error("[blog-store] delete failed:", e);
  }
}

// ========== 合并列表 ==========

export function getAllPosts(staticPosts: BlogPost[]): BlogPost[] {
  const custom = loadCustomPosts();
  console.log("[blog-store] getAllPosts: custom=", custom.length, "static=", staticPosts.length);
  return [...custom, ...staticPosts];
}

export function getPostBySlug(slug: string): BlogPost | null {
  if (typeof window === "undefined") return null;
  const posts = loadCustomPosts();
  const found = posts.find((p) => p.slug === slug);
  console.log("[blog-store] getPostBySlug:", slug, "found:", !!found);
  return found || null;
}
