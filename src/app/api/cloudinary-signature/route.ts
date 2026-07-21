import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// GET /api/cloudinary-signature — 返回 Cloudinary 上传签名（管理员鉴权）。
// 客户端拿签名直传 Cloudinary，避免音频大文件经过 Vercel 被平台 4.5MB 限制拒绝。
export async function GET(req: NextRequest) {
  if (!getAuthFromRequest(req)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary 未配置" }, { status: 500 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string> = {
    timestamp: String(timestamp),
  };
  // 按 key 排序拼接 → SHA1 → signature
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  const toSign = `${sorted}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    signature,
  });
}
