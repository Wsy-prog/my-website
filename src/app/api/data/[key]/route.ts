import { NextRequest, NextResponse } from "next/server";
import { ensureDB, loadData, saveData } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 无需认证即可写入的 key（留言板）
const PUBLIC_WRITE_KEYS = ["guestbook_messages"];

// GET /api/data/{key} — 读取数据（公开）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  try {
    await ensureDB();
    const result = await loadData!(key);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ data: null, exists: false, error: e.message }, { status: 500 });
  }
}

// POST /api/data/{key} — 写入数据（需认证，白名单除外）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;

  if (!PUBLIC_WRITE_KEYS.includes(key) && !getAuthFromRequest(req)) {
    return NextResponse.json({ ok: false, error: "需要管理员权限" }, { status: 401 });
  }

  try {
    await ensureDB();
    const body = await req.json();
    await saveData!(key, body.data);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
