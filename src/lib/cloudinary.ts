const CLOUD_NAME = "ii40ztmn";
const UPLOAD_PRESET = "my_website";

/** 上传图片到 Cloudinary，返回 URL */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
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

/** 压缩图片后上传（适用于博客/摄影场景，maxW 为最大宽度） */
export async function compressAndUpload(file: File, maxW: number = 1200): Promise<string> {
  const compressed = await compressImageToBlob(file, maxW);
  return uploadImage(compressed as any);
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
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
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
