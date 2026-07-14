// 博客评论区存储 —— 基于 localStorage，按文章 slug 隔离

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

function getKey(slug: string): string {
  return BASE_KEY + slug;
}

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

/** 保存某篇文章的评论 */
function saveCommentsRaw(slug: string, comments: any[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(slug), JSON.stringify(comments));
  } catch {
    /* quota */
  }
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

/** 保存评论（去掉 UI 状态） */
export function saveComments(slug: string, comments: BlogComment[]) {
  const strip = (ms: (BlogComment | BlogReply)[]): any[] =>
    ms.map(({ showReplyForm, ...m }) => ({ ...m, replies: strip(m.replies) }));
  saveCommentsRaw(slug, strip(comments));
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
