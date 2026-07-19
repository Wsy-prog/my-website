import { NextResponse } from "next/server";
import { ensureDB, loadData, saveData } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 存储到 Neon 数据库
    await ensureDB();
    const contacts = await loadContacts();
    contacts.unshift({
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      date: new Date().toISOString(),
      read: false,
    });
    await saveData("contact_messages", contacts);

    return NextResponse.json({ success: true, message: "消息已发送" });
  } catch {
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}

async function loadContacts(): Promise<any[]> {
  try {
    const result = await loadData<any[]>("contact_messages");
    return result?.data || [];
  } catch {
    return [];
  }
}
