// 博客评论区存储 —— 基于 localStorage + API 同步
// 数据结构：blog_comments_{slug} → BlogComment[]

export interface BlogReply {
  id: number;
  name: string;
  content: string;
  date: string;
  replies: BlogReply[];
  showReplyForm: boolean;
  parentName?: string;
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

/** 从服务端加载某篇文章的评论（按 slug 独立 key） */
export async function loadCommentsFromServerForSlug(slug: string): Promise<BlogComment[] | null> {
  try {
    const res = await fetch(`/api/data/${getKey(slug)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) {
      return json.data as BlogComment[];
    }
  } catch { console.warn("blog-comments: API fetch failed"); }
  return null;
}

/** 同步某篇文章评论到服务端（每篇文章独立 key，避免并发冲突） */
async function syncCommentsToServer(slug: string, comments: BlogComment[]) {
  const strip = (ms: (BlogComment | BlogReply)[]): any[] =>
    ms.map(({ showReplyForm, ...m }) => ({ ...m, replies: strip(m.replies) }));
  try {
    await fetch(`/api/data/${getKey(slug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: strip(comments) }),
    });
  } catch { console.warn("blog-comments: API sync failed"); }
}

// ========== 公开方法 ==========

// 串行化锁：防止并发保存竞争
let commentQueue: Promise<any> = Promise.resolve();
function serializedComment(fn: () => Promise<any>): Promise<any> {
  commentQueue = commentQueue.then(fn, () => Promise.resolve(undefined));
  return commentQueue;
}

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
  serializedComment(async () => {
    const strip = (ms: (BlogComment | BlogReply)[]): any[] =>
      ms.map(({ showReplyForm, ...m }) => ({ ...m, replies: strip(m.replies) }));
    saveCommentsRaw(slug, strip(comments));
    if (comments.length > 0) addSlug(slug);
    await syncCommentsToServer(slug, comments);
  });
}

/**
 * 从服务端拉取该文章的评论，覆盖本地缓存（服务端是权威源）。
 * 不再保留"本地独有"——这会把已删评论复活，且新增已走追加端点不依赖本地保留。 */
export async function mergeCommentsFromServer(slug: string): Promise<BlogComment[]> {
  const serverComments = await loadCommentsFromServerForSlug(slug);
  if (!serverComments || serverComments.length === 0) {
    // 服务端空 → 清空本地缓存，不保留任何本地旧数据
    saveCommentsRaw(slug, []);
    return [];
  }

  // 以服务端为准（评论/回复的增删改都在服务端权威）
  saveCommentsRaw(slug, serverComments);
  return serverComments;
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
