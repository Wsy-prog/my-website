import { NextRequest, NextResponse } from "next/server";
import { ensureDB, listAllKeys } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/data/keys — 列出数据库中所有 key（仅管理员，用于备份导出枚举动态 key 如 blog_comments_*）
export async function GET(req: NextRequest) {
  if (!getAuthFromRequest(req)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 401 });
  }
  try {
    await ensureDB();
    const keys = await listAllKeys();
    return NextResponse.json({ keys });
  } catch (e: any) {
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}
