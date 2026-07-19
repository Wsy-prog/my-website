import { NextRequest, NextResponse } from "next/server";
import { signToken, verifyPassword } from "@/lib/auth";

// 简单内存限流：每 IP 最多 5 次尝试 / 分钟
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 限流检查
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "尝试次数过多，请稍后再试" }, { status: 429 });
    }
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "请输入密码" }, { status: 400 });
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    // 登录成功重置限流
    rateLimit.delete(ip);

    const token = signToken();
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}