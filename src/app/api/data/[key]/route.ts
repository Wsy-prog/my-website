import { NextRequest, NextResponse } from "next/server";
import { loadData, saveData, initDB } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth";

// 无需认证即可写入的 key（留言板）
const PUBLIC_WRITE_KEYS = ["guestbook_messages"];

let initialized = false;

// GET /api/data/{key} — 读取数据（公开）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  try {
    if (!initialized) { await initDB(); initialized = true; }
    const result = await loadData(key);
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
    if (!initialized) { await initDB(); initialized = true; }
    const body = await req.json();
    await saveData(key, body.data);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
