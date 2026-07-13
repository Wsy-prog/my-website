import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuthFromRequest } from "@/lib/auth";

const DATA_DIR = path.join(process.cwd(), "data", "json");

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(key: string) {
  return path.join(DATA_DIR, `${key}.json`);
}

// 无需认证即可写入的 key 白名单（如留言板）
const PUBLIC_WRITE_KEYS = ["guestbook_messages"];

// GET /api/data/{key} — 读取数据（公开）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  try {
    const fp = filePath(key);
    if (!fs.existsSync(fp)) {
      return NextResponse.json({ data: null, exists: false });
    }
    const raw = fs.readFileSync(fp, "utf-8");
    return NextResponse.json({ data: JSON.parse(raw), exists: true });
  } catch {
    return NextResponse.json({ data: null, exists: false, error: "read failed" }, { status: 500 });
  }
}

// POST /api/data/{key} — 写入数据（需认证，白名单除外）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;

  // 白名单外的 key 需要管理员认证
  if (!PUBLIC_WRITE_KEYS.includes(key) && !getAuthFromRequest(req)) {
    return NextResponse.json({ ok: false, error: "需要管理员权限" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const fp = filePath(key);
    fs.writeFileSync(fp, JSON.stringify(body.data, null, 2), "utf-8");
    // 同时复制到 C:\个人网页\数据\（如果目录存在）
    const mirrorDir = "C:\\个人网页\\数据";
    if (fs.existsSync(mirrorDir)) {
      try { fs.writeFileSync(path.join(mirrorDir, `${key}.json`), JSON.stringify(body.data, null, 2), "utf-8"); } catch { /* 忽略镜像写入失败 */ }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "write failed" }, { status: 500 });
  }
}
