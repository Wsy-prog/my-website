import { NextRequest, NextResponse } from "next/server";
import { signToken, verifyPassword } from "@/lib/auth";

// ===== 登录限流：每 IP 每分钟最多 5 次尝试 =====
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (entry.count >= RATE_LIMIT_MAX) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

export async function POST(req: NextRequest) {
  try {
    // 取真实客户端 IP：优先 Vercel 的 x-vercel-forwarded-for，否则取 x-forwarded-for 的末位
    // （末位是可信代理链最右侧追加的值，无法被客户端伪造；首位可被客户端伪造，不可用）
    const xff = req.headers.get("x-vercel-forwarded-for") || req.headers.get("x-forwarded-for") || "";
    const ip = xff.split(",").map((s) => s.trim()).filter(Boolean).pop()
      || req.headers.get("x-real-ip") || "unknown";
    const { allowed } = checkRateLimit(ip);
    if (!allowed) return NextResponse.json({ error: "请求过于频繁，请 1 分钟后再试" }, { status: 429, headers: { "Retry-After": "60" } });

    const body = await req.json();
    const { password } = body;
    if (!password || typeof password !== "string") return NextResponse.json({ error: "请输入密码" }, { status: 400 });
    if (!verifyPassword(password)) return NextResponse.json({ error: "密码错误" }, { status: 401 });

    const token = signToken();
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}