import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ valid: false });
  }
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  const payload = verifyToken(token);
  return NextResponse.json({ valid: payload !== null });
}
