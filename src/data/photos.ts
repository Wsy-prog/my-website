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

export const defaultPhotos: Photo[] = [];

const PHOTOS_KEY = "gallery_photos";
const TOKEN_KEY = "admin_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}


async function syncToApi(photos: Photo[]) {
  const token = getToken();
  try {
    await fetch("/api/data/gallery_photos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data: photos }),
    });
  } catch { /* 静默 */ }
}

/** 从服务端加载照片（异步），用于初始化 */
export async function loadPhotosFromServer(): Promise<Photo[] | null> {
  try {
    const res = await fetch("/api/data/gallery_photos");
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) {
      return json.data;
    }
    if (json.exists && json.data === null) {
      return null;
    }
    if (json.exists) {
      return [];
    }
  } catch { /* 网络错误 */ }
  return null;
}

export function loadPhotos(): Photo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PHOTOS_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw) as Photo[];
    return saved;
  } catch {
    return [];
  }
}

export function savePhotos(photos: Photo[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
    syncToApi(photos);
  } catch { /* quota exceeded */ }
}
