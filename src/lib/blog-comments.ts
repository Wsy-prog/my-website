// 博客评论区存储 —— 基于 localStorage + API 同步（每篇文章独立 key）
// 数据结构：blog_comments_{slug} → BlogComment[]
// 不再使用 blog_comments_all 单一 key 避免并发写入覆盖

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

// ========== 服务端同步（每篇文章独立 key） ==========

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

/** 从服务端加载某篇文章的评论 */
async function loadCommentsFromServerForSlug(slug: string): Promise<BlogComment[] | null> {
  try {
    const res = await fetch(`/api/data/${getKey(slug)}`);
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) {
      return json.data as BlogComment[];
    }
  } catch { /* 网络错误 */ }
  return null;
}

// 写入序列化锁 —— 防止并发写入竞态
const syncLocks = new Map<string, Promise<void>>();

/** 同步某篇文章评论到服务端（带序列化锁，避免并发写入覆盖） */
async function syncCommentsToServer(slug: string, comments: BlogComment[]) {
  const strip = (ms: (BlogComment | BlogReply)[]): any[] =>
    ms.map(({ showReplyForm, ...m }) => ({ ...m, replies: strip(m.replies) }));

  const doSync = async () => {
    try {
      await fetch(`/api/data/${getKey(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: strip(comments) }),
      });
    } catch { /* 静默 */ }
  };

  // 序列化：每个 slug 的写入串行执行
  const prev = syncLocks.get(slug) || Promise.resolve();
  const next = prev.then(doSync, doSync);
  syncLocks.set(slug, next);
  return next;
}

// ========== 公开方法 ==========

/** 加载评论（添加 UI 状态） */
export function loadComments(slug: string): BlogComment[] {
  const raw = loadCommentsRaw(slug);
  if (!Array.isArray(raw) || raw.length === 0) return [];
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
  // 同步到服务端
  syncCommentsToServer(slug, comments);
}

/**
 * 从服务端拉取该文章的最新评论，与本地双向合并：
 * - 服务端有、本地无 → 新增
 * - 本地有、服务端无 → 保留（本地尚未同步的新评论）
 * - 都存在 → 比较 id，取最新
 */
export async function mergeCommentsFromServer(slug: string): Promise<BlogComment[]> {
  const serverComments = await loadCommentsFromServerForSlug(slug);
  if (!serverComments || serverComments.length === 0) {
    // 服务端无数据，返回本地数据
    return loadComments(slug);
  }

  const local = loadComments(slug);
  const localMap = new Map<number, BlogComment>();
  local.forEach((c) => localMap.set(c.id, c));

  const serverMap = new Map<number, BlogComment>();
  serverComments.forEach((c) => serverMap.set(c.id, c));

  // 双向合并：以 id 为 key，服务端优先（覆盖点赞数等更新），本地补充服务端没有的
  const merged = new Map<number, BlogComment>();

  // 先处理所有服务端评论
  for (const [id, sc] of serverMap) {
    merged.set(id, sc);
  }

  // 补充本地有但服务端没有的评论（尚未同步的新评论）
  for (const [id, lc] of localMap) {
    if (!merged.has(id)) {
      merged.set(id, lc);
    }
  }

  const result = Array.from(merged.values()).sort((a, b) => b.id - a.id);

  // 写回本地
  saveComments(slug, result);

  return result;
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
