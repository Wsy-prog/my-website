import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Cloudinary 服务端代理上传：避免在客户端暴露 upload_preset 导致任何人可上传。
// 客户端 POST FormData{file, kind}（kind: image|video|auto），服务端用 API key/secret
// 以基础认证转传给 Cloudinary，返回 secure_url。仅管理员可调用。
export async function POST(req: NextRequest) {
  // 仅管理员可上传
  if (!getAuthFromRequest(req)) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary 未配置" }, { status: 500 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const kind = (form.get("kind") as string) || "auto"; // image | video | auto
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }

    // 限制文件大小：图片 15MB，音视频 50MB
    const maxBytes = kind === "image" ? 15 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "文件过大" }, { status: 413 });
    }

    // 转传给 Cloudinary，用 API key/secret 做基础认证
    const upstream = new FormData();
    upstream.append("file", file, file.name);

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${kind}/upload`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}` },
      body: upstream,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: (err as any).error?.message || "上传失败" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ secure_url: data.secure_url });
  } catch (e: any) {
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
