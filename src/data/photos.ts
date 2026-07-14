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
const DELETED_DEFAULTS_KEY = "gallery_deleted_defaults";
const TOKEN_KEY = "admin_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** 获取已被用户删除的默认照片 ID 集合 */
function getDeletedDefaultIds(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELETED_DEFAULTS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

/** 标记一个默认照片为已删除（持久化） */
export function markDefaultDeleted(photoId: number) {
  if (typeof window === "undefined") return;
  const deleted = getDeletedDefaultIds();
  deleted.add(photoId);
  localStorage.setItem(DELETED_DEFAULTS_KEY, JSON.stringify(Array.from(deleted)));
}

/** 重置所有默认照片（让被删的默认照片重新出现） */
export function resetDeletedDefaults() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DELETED_DEFAULTS_KEY);
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
export async function loadPhotosFromServer(): Promise<Photo[]> {
  try {
    const res = await fetch("/api/data/gallery_photos");
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) {
      return json.data;
    }
  } catch { /* 网络错误 */ }
  return [];
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
