/** 客户端上传：走服务端代理 /api/upload（服务端用 Cloudinary API key/secret 签名），避免暴露无签名 upload_preset */

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem("admin_token"); } catch { return null; }
}

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

/** 上传任意文件到 Cloudinary（图片/音频/视频等），返回 URL */
export async function uploadToCloudinary(file: File): Promise<string> {
  return uploadViaProxy(file, "auto");
}

/** 上传图片到 Cloudinary，返回 URL */
export async function uploadImage(file: File): Promise<string> {
  return uploadViaProxy(file, "image");
}

/** 上传音频文件到 Cloudinary（mp3/wav 等），返回 URL */
export async function uploadAudio(file: File): Promise<string> {
  return uploadViaProxy(file, "video");
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
