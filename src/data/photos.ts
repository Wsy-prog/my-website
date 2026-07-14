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

export const defaultPhotos: Photo[] = [
  { id: 1, src: "https://picsum.photos/seed/1/800/600", title: "日出金山", category: "风光", camera: "Sony A7M4", date: "2025-01-15" },
  { id: 2, src: "https://picsum.photos/seed/2/600/800", title: "人像习作", category: "人像", camera: "Canon R6", date: "2025-02-20" },
  { id: 3, src: "https://picsum.photos/seed/3/800/500", title: "海边落日", category: "风光", camera: "Sony A7M4", date: "2025-03-10", location: "厦门", tags: ["落日", "海边"] },
  { id: 4, src: "https://picsum.photos/seed/4/600/900", title: "微笑", category: "人像", camera: "Canon R6", date: "2025-02-14", tags: ["人像", "黑白"] },
  { id: 5, src: "https://picsum.photos/seed/5/800/600", title: "骑行抓拍", category: "运动", camera: "Fujifilm X-T5", date: "2024-12-08", tags: ["骑行"] },
  { id: 6, src: "https://picsum.photos/seed/6/600/600", title: "泳池瞬间", category: "运动", camera: "Sony A7M4", date: "2024-11-22", location: "海南五指山" },
  { id: 7, src: "https://picsum.photos/seed/7/800/700", title: "Vlog#1", category: "视频", camera: "DJI Pocket 3", date: "2025-04-05" },
  { id: 8, src: "https://picsum.photos/seed/8/700/800", title: "山间晨雾", category: "风光", camera: "Sony A7M4", date: "2025-01-28", location: "安徽宏村" },
  { id: 9, src: "https://picsum.photos/seed/9/800/600", title: "旅行短片", category: "视频", camera: "iPhone 15 Pro", date: "2024-10-16" },
  { id: 10, src: "https://picsum.photos/seed/10/600/800", title: "街拍人像", category: "人像", camera: "Fujifilm X-T5", date: "2024-09-30", location: "香港" },
  { id: 11, src: "https://picsum.photos/seed/11/800/500", title: "少女与花", category: "人像", camera: "Canon R6", date: "2025-03-18" },
  { id: 12, src: "https://picsum.photos/seed/12/600/700", title: "川西自驾", category: "风光", camera: "Sony A7M4", date: "2025-04-25", location: "四川成都" },
  { id: 13, src: "https://picsum.photos/seed/13/800/600", title: "咖啡时光", category: "生活", camera: "iPhone 15 Pro", date: "2025-03-08" },
  { id: 14, src: "https://picsum.photos/seed/14/600/800", title: "市集随拍", category: "生活", camera: "Fujifilm X-T5", date: "2025-02-12" },
  { id: 15, src: "https://picsum.photos/seed/15/800/600", title: "宏村月沼", category: "风光", camera: "Sony A7M4", date: "2026-04-10", location: "安徽宏村" },
  { id: 16, src: "https://picsum.photos/seed/16/800/500", title: "洪崖洞夜景", category: "风光", camera: "Sony A7M4", date: "2025-11-20", location: "重庆" },
  { id: 17, src: "https://picsum.photos/seed/17/600/800", title: "解放碑人潮", category: "人像", camera: "Fujifilm X-T5", date: "2025-11-20", location: "重庆" },
  { id: 18, src: "https://picsum.photos/seed/18/800/600", title: "山城步道", category: "生活", camera: "iPhone 15 Pro", date: "2025-11-20", location: "重庆" },
  { id: 19, src: "https://picsum.photos/seed/19/600/600", title: "长江索道", category: "风光", camera: "Sony A7M4", date: "2025-11-20", location: "重庆" },
];

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
  if (typeof window === "undefined") return defaultPhotos;
  try {
    const raw = localStorage.getItem(PHOTOS_KEY);
    if (!raw) {
      // 首次使用：返回默认照片中未被删除的部分
      const deletedIds = getDeletedDefaultIds();
      if (deletedIds.size > 0) {
        return defaultPhotos.filter((p) => !deletedIds.has(p.id));
      }
      return defaultPhotos;
    }
    const saved = JSON.parse(raw) as Photo[];
    const savedIds = new Set(saved.map((p) => p.id));
    const deletedIds = getDeletedDefaultIds();
    // 只补充那些没有被标记删除的默认照片
    const newDefaults = defaultPhotos.filter((p) => !savedIds.has(p.id) && !deletedIds.has(p.id));
    if (newDefaults.length > 0) {
      return [...newDefaults, ...saved];
    }
    return saved;
  } catch {
    return defaultPhotos;
  }
}

export function savePhotos(photos: Photo[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
    syncToApi(photos);
  } catch { /* quota exceeded */ }
}
