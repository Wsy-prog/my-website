/**
 * 统一图片库 — 聚合所有来源的图片 URL，去重返回。
 * 新增图片源只需改这一个文件。
 */

export function getAllImages(): string[] {
  const urlSet = new Set<string>();

  try {
    // 1. 摄影画廊照片
    const galleryPhotos = JSON.parse(localStorage.getItem("gallery_photos") || "[]");
    for (const p of galleryPhotos) {
      if (p.src && typeof p.src === "string") urlSet.add(p.src);
    }
  } catch {}

  try {
    // 2. 博客文章：封面 + 正文内嵌图片
    const posts = JSON.parse(localStorage.getItem("blog_custom_posts") || "[]");
    for (const p of posts) {
      if (p.coverImage && typeof p.coverImage === "string") urlSet.add(p.coverImage);
      if (p.content && typeof p.content === "string") {
        const imgRegex = /<img[^>]+src="([^"]+)"/g;
        let match;
        while ((match = imgRegex.exec(p.content)) !== null) {
          if (match[1]) urlSet.add(match[1]);
        }
      }
    }
  } catch {}

  try {
    // 3. 背景壁纸（仅 Cloudinary URL + 默认壁纸）
    const assets = JSON.parse(localStorage.getItem("bg_assets") || "[]");
    for (const a of assets) {
      if (a.type === "image" && a.src && typeof a.src === "string") {
        urlSet.add(a.src);
      }
    }
  } catch {}

  // 4. 默认壁纸（如果没有的话）
  if (!urlSet.has("/images/bg.jpg")) {
    urlSet.add("/images/bg.jpg");
  }

  return Array.from(urlSet);
}

/** 提取文件名作为显示标题 */
export function imageTitle(url: string): string {
  const name = url.split("/").pop()?.replace(/\.[^.]+$/, "") || "";
  return decodeURIComponent(name);
}
