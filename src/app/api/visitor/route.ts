import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { loadFromDb, saveToDb } = await import("@/lib/db");
    const result = await loadFromDb<number>("guestbook_visitor_count");
    const current = (result?.data as number) || 0;
    const next = current + 1;
    await saveToDb("guestbook_visitor_count", next);
    return NextResponse.json({ count: next });
  } catch {
    return NextResponse.json({ count: 1 });
  }
}