import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    console.log("收到新消息:", { name, email, message });
    return NextResponse.json({ success: true, message: "消息已记录" });
  } catch {
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}
