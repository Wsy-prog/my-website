import { travelMarkers, type TravelMarker } from "@/data/travel-markers";

const MARKERS_KEY = "travel_all_markers";
const VERSION_KEY = "travel_markers_version";
const CURRENT_VERSION = 8;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("admin_token");
  } catch {
    return null;
  }
}

function loadStoredMarkers(): TravelMarker[] {
  try {
    const raw = localStorage.getItem(MARKERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function syncToApi(markers: TravelMarker[]) {
  try {
    await fetch("/api/data/travel_all_markers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: markers }),
    });
  } catch { /* 静默 */ }
}

export function saveAllMarkers(markers: TravelMarker[]) {
  try {
    localStorage.setItem(MARKERS_KEY, JSON.stringify(markers));
    localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
    syncToApi(markers);
  } catch { /* quota */ }
}

/** 从服务端加载标记（异步） */
export async function loadMarkersFromServer(): Promise<TravelMarker[] | null> {
  try {
    const res = await fetch("/api/data/travel_all_markers");
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) {
      return json.data;
    }
    if (json.exists && json.data === null) {
      // key 存在但 value 为 null → 还没同步过，返回 null 让前端回退本地
      return null;
    }
    if (json.exists) {
      return [];
    }
  } catch { /* 网络错误 */ }
  return null;
}

export function getAllMarkers(): TravelMarker[] {
  if (typeof window === "undefined") return travelMarkers;
  const version = parseInt(localStorage.getItem(VERSION_KEY) || "0", 10);
  if (version < CURRENT_VERSION) {
    const stored = loadStoredMarkers();
    const storedMap = new Map(stored.map(m => [m.id, m]));
    const updated: TravelMarker[] = [];
    for (const def of travelMarkers) {
      const existing = storedMap.get(def.id);
      if (existing) {
        updated.push({ ...existing, lat: def.lat, lng: def.lng, type: def.type });
      }
    }
    const defaultIds = new Set(travelMarkers.map(m => m.id));
    for (const s of stored) {
      if (!defaultIds.has(s.id)) updated.push(s);
    }
    saveAllMarkers(updated);
    return updated;
  }
  const stored = loadStoredMarkers();
  return stored;
}
