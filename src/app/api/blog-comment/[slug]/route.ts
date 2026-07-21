import { NextRequest, NextResponse } from "next/server";
import { ensureDB, loadFromDb, saveToDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE_KEY = "blog_comments_";

interface BlogReply {
  id: number;
  name: string;
  content: string;
  date: string;
  replies: BlogReply[];
}
interface BlogComment {
  id: number;
  name: string;
  content: string;
  date: string;
  likes: number;
  replies: BlogReply[];
}

// 在回复树中按 parentId 添加回复
function addReplyDeep(replies: BlogReply[], parentId: number, newReply: BlogReply): BlogReply[] {
  return replies.map((r) => {
    if (r.id === parentId) return { ...r, replies: [...r.replies, newReply] };
    if (r.replies.length > 0) return { ...r, replies: addReplyDeep(r.replies, parentId, newReply) };
    return r;
  });
}

// POST /api/blog-comment/{slug} — 追加单条评论或回复
// body: { name, content, parentId?, parentReplyId? }
// - 无 parentId：新增顶层评论
// - 有 parentId + parentReplyId=null：回复顶层评论
// - 有 parentId + parentReplyId：回复某条子回复
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return NextResponse.json({ error: "无效的文章标识" }, { status: 400 });
    }

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 50) : "";
    const content = typeof body.content === "string" ? body.content.trim().slice(0, 1000) : "";
    if (!name || !content) {
      return NextResponse.json({ error: "昵称和内容不能为空" }, { status: 400 });
    }
    const parentId = typeof body.parentId === "number" ? body.parentId : null;
    const parentReplyId = typeof body.parentReplyId === "number" ? body.parentReplyId : null;

    await ensureDB();
    const key = BASE_KEY + slug;
    const existing = await loadFromDb<BlogComment[]>(key);
    const comments = existing.exists && Array.isArray(existing.data) ? existing.data : [];

    const newEntry: BlogReply = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      name,
      content,
      date: new Date().toISOString().split("T")[0],
      replies: [],
    };

    let updated: BlogComment[];
    if (parentId === null) {
      // 新增顶层评论
      const newComment: BlogComment = { ...newEntry, likes: 0 };
      updated = [newComment, ...comments];
    } else {
      // 回复：找到对应顶层评论，在其 replies 树里插入
      let found = false;
      updated = comments.map((c) => {
        if (c.id !== parentId) return c;
        found = true;
        if (parentReplyId === null) {
          return { ...c, replies: [...c.replies, newEntry] };
        }
        return { ...c, replies: addReplyDeep(c.replies, parentReplyId, newEntry) };
      });
      if (!found) {
        return NextResponse.json({ error: "父评论不存在" }, { status: 404 });
      }
    }

    await saveToDb(key, updated);
    return NextResponse.json({ ok: true, entry: newEntry });
  } catch (e: any) {
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}
