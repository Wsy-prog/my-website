import { NextRequest, NextResponse } from "next/server";
import { signToken, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "请输入密码" }, { status: 400 });
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    const token = signToken();
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
