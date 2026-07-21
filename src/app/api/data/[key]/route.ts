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

// 读取需要管理员权限的 key（含隐私数据，如联系表单投稿）
const PROTECTED_READ_KEYS = ["contact_messages"];

// 写入时需"按 id 合并"而非整体覆盖的 key（防止并发写互相清空、防恶意清空）
// 这些 key 的 value 是对象数组，且每个对象带 id 字段。
const MERGED_WRITE_KEYS = ["guestbook_messages"];
const MERGED_WRITE_PREFIXES = ["blog_comments_"];

function isMergedKey(key: string): boolean {
  return MERGED_WRITE_KEYS.includes(key) || MERGED_WRITE_PREFIXES.some((p) => key.startsWith(p));
}

/** 按 id 合并：服务端现有 + 请求体，请求体优先（同 id 覆盖），保留服务端独有的项。
 *  _deleted 标记优先（管理员软删除）：任一方 _deleted 则结果标记删除。
 *  不过滤 tombstone——写入数据库时保留 _deleted 记录，防止其他客户端全量 POST 复活。 */
function mergeById(server: any[], incoming: any[]): any[] {
  const map = new Map<number, any>();
  for (const item of server) if (item && typeof item.id !== "undefined") map.set(item.id, item);
  for (const item of incoming) {
    if (!item || typeof item.id === "undefined") continue;
    const existing = map.get(item.id);
    if (existing && (existing._deleted || item._deleted)) {
      map.set(item.id, { ...existing, ...item, _deleted: true });
    } else {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

/** 递归按 id 合并评论（顶层评论 + 各层 replies）。
 *  _deleted 标记优先（管理员软删除）：任一方 _deleted 则该条删除。
 *  不过滤 tombstone——写入数据库时保留 _deleted 记录，防止其他客户端全量 POST 复活。 */
function mergeComments(server: any[], incoming: any[]): any[] {
  const map = new Map<number, any>();
  for (const c of server) if (c && typeof c.id !== "undefined") map.set(c.id, c);
  for (const c of incoming) {
    if (!c || typeof c.id === "undefined") continue;
    const existing = map.get(c.id);
    if (existing) {
      const deleted = existing._deleted || c._deleted;
      map.set(c.id, {
        ...existing,
        ...c,
        _deleted: deleted,
        replies: mergeComments(existing.replies || [], c.replies || []),
      });
    } else {
      map.set(c.id, c);
    }
  }
  return Array.from(map.values());
}

/** 递归过滤掉 _deleted 标记的项（顶层 + 嵌套 replies），用于 GET 返回前 */
function filterDeleted(items: any[]): any[] {
  return items
    .filter((x) => !x?._deleted)
    .map((x) => (x.replies ? { ...x, replies: filterDeleted(x.replies) } : x));
}

// GET /api/data/{key} — 读取数据（公开，敏感 key 需鉴权）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  try {
    if (PROTECTED_READ_KEYS.includes(key) && !getAuthFromRequest(_req)) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 401 });
    }
    await ensureDB();
    const result = await loadFromDb(key);
    // 对评论/留言等软删除 key，访客看到的是过滤 _deleted 后的结果；
    // 管理员看到原始数据（含 tombstone），便于确认删除状态。
    if (isMergedKey(key) && result.exists && Array.isArray(result.data) && !getAuthFromRequest(_req)) {
      result.data = filterDeleted(result.data);
    }
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
    let toSave = body.data;

    // 留言/评论等公开协作 key：按 id 合并，避免整体覆盖丢数据 / 被恶意清空
    if (isMergedKey(key) && Array.isArray(toSave)) {
      const existing = await loadFromDb<any[]>(key);
      const serverData = existing.exists && Array.isArray(existing.data) ? existing.data : [];
      if (key.startsWith("blog_comments_")) {
        toSave = mergeComments(serverData, toSave);
      } else {
        toSave = mergeById(serverData, toSave);
      }
    }

    await saveToDb(key, toSave);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "写入失败" }, { status: 500 });
  }
}
