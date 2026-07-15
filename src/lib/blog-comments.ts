// 博客评论区存储 —— 基于 localStorage + API 同步
// 数据结构：blog_comments_{slug} → BlogComment[]

export interface BlogReply {
  id: number;
  name: string;
  content: string;
  date: string;
  replies: BlogReply[];
  showReplyForm: boolean;
}

export interface BlogComment {
  id: number;
  name: string;
  content: string;
  date: string;
  likes: number;
  replies: BlogReply[];
  showReplyForm: boolean;
}

const BASE_KEY = "blog_comments_";
const INDEX_KEY = "blog_comments_slugs"; // 记录哪些文章有评论

function getKey(slug: string): string {
  return BASE_KEY + slug;
}

// ========== 本地操作 ==========

/** 加载某篇文章的评论（不暴露 UI 状态） */
function loadCommentsRaw(slug: string): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getKey(slug));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 保存某篇文章的评论到本地 */
function saveCommentsRaw(slug: string, comments: any[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(slug), JSON.stringify(comments));
  } catch {
    /* quota */
  }
}

// ========== 服务端同步 ==========

/** 获取所有有评论的 slug */
export function getCommentSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || "[]");
  } catch { return []; }
}

function addSlug(slug: string) {
  const slugs = getCommentSlugs();
  if (!slugs.includes(slug)) {
    slugs.push(slug);
    localStorage.setItem(INDEX_KEY, JSON.stringify(slugs));
  }
}

/** 从服务端加载所有评论 */
export async function loadCommentsFromServer(): Promise<Record<string, BlogComment[]>> {
  try {
    const res = await fetch("/api/data/blog_comments_all");
    const json = await res.json();
    if (json.exists && json.data && typeof json.data === "object") {
      return json.data as Record<string, BlogComment[]>;
    }
  } catch { /* 网络错误 */ }
  return {};
}

/** 同步某篇文章评论到服务端 */
async function syncCommentsToServer(slug: string, comments: BlogComment[]) {
  try {
    // 先获取服务端所有评论
    const all = await loadCommentsFromServer();
    all[slug] = comments;
    await fetch("/api/data/blog_comments_all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: all }),
    });
  } catch { /* 静默 */ }
}

// ========== 公开方法 ==========

/** 加载评论（添加 UI 状态） */
export function loadComments(slug: string): BlogComment[] {
  const raw = loadCommentsRaw(slug);
  if (raw.length === 0) return [];
  const hydrate = (msgs: (BlogComment | BlogReply)[]): (BlogComment | BlogReply)[] =>
    msgs.map((m) => ({ ...m, showReplyForm: false, replies: hydrate(m.replies) as BlogReply[] }));
  return hydrate(raw) as BlogComment[];
}

/** 保存评论（去掉 UI 状态，同步本地 + 服务端） */
export function saveComments(slug: string, comments: BlogComment[]) {
  const strip = (ms: (BlogComment | BlogReply)[]): any[] =>
    ms.map(({ showReplyForm, ...m }) => ({ ...m, replies: strip(m.replies) }));
  saveCommentsRaw(slug, strip(comments));
  if (comments.length > 0) {
    addSlug(slug);
  }
  // 异步同步到服务端
  syncCommentsToServer(slug, comments);
}

// ========== 工具函数 ==========

/** 在回复树中找到指定 id 的回复并更新 */
export function updateReplyDeep(replies: BlogReply[], id: number, updater: (r: BlogReply) => BlogReply): BlogReply[] {
  return replies.map((r) => {
    if (r.id === id) return updater(r);
    if (r.replies.length > 0) return { ...r, replies: updateReplyDeep(r.replies, id, updater) };
    return r;
  });
}

/** 在回复树中找到指定 parentId 添加新回复 */
export function addReplyDeep(replies: BlogReply[], parentId: number, newReply: BlogReply): BlogReply[] {
  return replies.map((r) => {
    if (r.id === parentId) return { ...r, replies: [...r.replies, newReply], showReplyForm: false };
    if (r.replies.length > 0) return { ...r, replies: addReplyDeep(r.replies, parentId, newReply) };
    return r;
  });
}
