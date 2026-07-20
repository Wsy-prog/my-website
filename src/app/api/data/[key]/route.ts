import { NextRequest, NextResponse } from "next/server";
import { ensureDB, loadFromDb, saveToDb } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 无需认证即可写入的 key（访客可写的公开数据）
const PUBLIC_WRITE_KEYS = [
  "guestbook_messages",
  "guestbook_visitor_count",
];

// 前缀匹配的公开写入 key（如 blog_comments_{slug} — 访客评论）
const PUBLIC_WRITE_PREFIXES = ["blog_comments_"];

// GET /api/data/{key} — 读取数据（公开）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  try {
    await ensureDB();
    const result = await loadFromDb(key);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}

// POST /api/data/{key} — 写入数据（需认证，白名单除外）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;

  const isPublicWrite =
    PUBLIC_WRITE_KEYS.includes(key) ||
    PUBLIC_WRITE_PREFIXES.some((p) => key.startsWith(p));

  if (!isPublicWrite && !getAuthFromRequest(req)) {
    return NextResponse.json({ ok: false, error: "需要管理员权限" }, { status: 401 });
  }

  try {
    await ensureDB();
    const body = await req.json();
    await saveToDb(key, body.data);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "写入失败" }, { status: 500 });
  }
}
