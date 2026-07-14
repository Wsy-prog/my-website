export interface Photo {
  id: number;
  src: string;
  title: string;
  category: string;
  camera: string;
  date: string;
  location?: string;
  tags?: string[];
}

const PHOTOS_KEY = "gallery_photos";

// ========== 服务端（权威数据源） ==========

/** 从服务端加载照片（异步） */
export async function loadFromApi(): Promise<Photo[]> {
  try {
    const res = await fetch("/api/data/gallery_photos");
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) {
      return json.data as Photo[];
    }
  } catch { /* 网络错误 */ }
  return [];
}

/** 同步到服务端 */
async function saveToApi(photos: Photo[]) {
  try {
    await fetch("/api/data/gallery_photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: photos }),
    });
  } catch { /* 静默 */ }
}

// ========== 本地缓存 ==========

function loadCache(): Photo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PHOTOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCache(photos: Photo[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos)); } catch {}
}

// ========== 公开方法 ==========

/** 同步加载本地缓存的照片（立即显示用） */
export function loadPhotos(): Photo[] {
  return loadCache();
}

/** 从 API 拉取照片并缓存（仅在 API 返回非空数据时才覆盖缓存） */
export async function loadPhotosFromServer(): Promise<Photo[]> {
  const photos = await loadFromApi();
  if (photos.length > 0) {
    saveCache(photos);
  }
  return photos;
}

/** 保存照片（写入 API + 缓存） */
export function savePhotos(photos: Photo[]) {
  saveCache(photos);
  saveToApi(photos);
}
