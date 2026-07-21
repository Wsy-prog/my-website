import { NextRequest, NextResponse } from "next/server";
import { ensureDB, loadFromDb, saveToDb } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 轻量限流：每 IP 每分钟最多 5 条留言，防刷
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

interface GuestMessage {
  id: number;
  name: string;
  content: string;
  date: string;
  likes: number;
  replies: any[];
}

// POST /api/guestbook/message — 追加单条留言（服务端读-改-写，按 id 去重）
export async function POST(req: NextRequest) {
  try {
    const xff = req.headers.get("x-vercel-forwarded-for") || req.headers.get("x-forwarded-for") || "";
    const ip = xff.split(",").map((s) => s.trim()).filter(Boolean).pop() || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "留言过于频繁，请稍后再试" }, { status: 429 });
    }

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 50) : "";
    const content = typeof body.content === "string" ? body.content.trim().slice(0, 1000) : "";
    if (!name || !content) {
      return NextResponse.json({ error: "昵称和内容不能为空" }, { status: 400 });
    }

    await ensureDB();
    const existing = await loadFromDb<GuestMessage[]>("guestbook_messages");
    const messages = existing.exists && Array.isArray(existing.data) ? existing.data : [];

    const newMsg: GuestMessage = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      name,
      content,
      date: new Date().toISOString().split("T")[0],
      likes: 0,
      replies: [],
    };
    const updated = [newMsg, ...messages];
    await saveToDb("guestbook_messages", updated);

    return NextResponse.json({ ok: true, message: newMsg });
  } catch (e: any) {
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}

// 在回复树中按 id 标记软删除
function markReplyDeleted(replies: any[], id: number): any[] {
  return replies.map((r) => {
    if (r.id === id) return { ...r, _deleted: true, replies: markReplyDeleted(r.replies || [], id) };
    return { ...r, replies: markReplyDeleted(r.replies || [], id) };
  });
}

// DELETE /api/guestbook/message?id=<msgId> — 管理员删除留言/回复
// 软删除：标记 _deleted 而非真删，合并保护会尊重 _deleted，防止其他访客缓存的全量 POST 复活已删留言。
export async function DELETE(req: NextRequest) {
  try {
    if (!getAuthFromRequest(req)) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 401 });
    }
    const idStr = req.nextUrl.searchParams.get("id");
    const id = idStr ? parseInt(idStr, 10) : NaN;
    if (isNaN(id)) {
      return NextResponse.json({ error: "缺少有效的 id" }, { status: 400 });
    }

    await ensureDB();
    const existing = await loadFromDb<GuestMessage[]>("guestbook_messages");
    const messages = existing.exists && Array.isArray(existing.data) ? existing.data : [];
    const updated = messages.map((m) => {
      if (m.id === id) return { ...m, _deleted: true, replies: markReplyDeleted(m.replies || [], id) };
      return { ...m, replies: markReplyDeleted(m.replies || [], id) };
    });

    await saveToDb("guestbook_messages", updated);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
