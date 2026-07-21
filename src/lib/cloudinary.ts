/**
 * Cloudinary 上传：客户端直传（签名模式），绕过 Vercel body 大小限制。
 *
 * Vercel 免费计划 HTTP body 限制 4.5MB，音频文件通常超过此大小，
 * 走服务端代理 /api/upload 会被 Vercel 前置层拒绝（413）。
 *
 * 改为：服务端返回上传签名（/api/cloudinary-signature，管理员鉴权），
 * 客户端拿签名直传 Cloudinary API，流量不经过 Vercel。
 * 图片压缩后通常 < 1MB，仍可走代理（简单稳定），但统一走直传更一致。
 */

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem("admin_token"); } catch { return null; }
}

interface CloudinarySig {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
}

let sigCache: CloudinarySig | null = null;
let sigExpiry = 0;

async function getSignature(): Promise<CloudinarySig> {
  if (sigCache && Date.now() < sigExpiry) return sigCache;
  const token = getAdminToken();
  const res = await fetch("/api/cloudinary-signature", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || "获取上传签名失败");
  }
  sigCache = await res.json();
  sigExpiry = Date.now() + 10 * 60 * 1000; // 缓存 10 分钟
  return sigCache!;
}

// 图片压缩后通常 < 1MB，仍可走代理（简单稳定）。
async function uploadViaProxy(file: File | Blob, kind: "image" | "video" | "auto"): Promise<string> {
  const token = getAdminToken();
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || "上传失败");
  }
  const data = await res.json();
  return data.secure_url as string;
}

/** 客户端直传 Cloudinary（绕过 Vercel body 限制），签名保护 */
async function directUpload(file: File | Blob, kind: "image" | "video" | "auto"): Promise<string> {
  const sig = await getSignature();
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${kind}/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error?.message || "上传失败");
  }
  const data = await res.json();
  return data.secure_url as string;
}

/** 上传任意文件到 Cloudinary（直传，绕过 Vercel body 限制） */
export async function uploadToCloudinary(file: File): Promise<string> {
  return directUpload(file, "auto");
}

/** 上传图片到 Cloudinary（压缩后较小，走代理） */
export async function uploadImage(file: File): Promise<string> {
  return uploadViaProxy(file, "image");
}

/** 上传音频文件到 Cloudinary（直传，音频通常 >4.5MB） */
export async function uploadAudio(file: File): Promise<string> {
  return directUpload(file, "video");
}

/** 压缩图片后上传（适用于博客/摄影场景，maxW 为最大宽度） */
export async function compressAndUpload(file: File, maxW: number = 1200): Promise<string> {
  const compressed = await compressImageToBlob(file, maxW);
  return uploadViaProxy(compressed, "image");
}

/** 将图片文件压缩为 Blob */
function compressImageToBlob(file: File, maxW: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas 不可用")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("压缩失败"));
        }, "image/jpeg", 0.8);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
