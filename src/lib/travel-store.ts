import { travelMarkers, type TravelMarker } from "@/data/travel-markers";

const MARKERS_KEY = "travel_all_markers";
const VERSION_KEY = "travel_markers_version";
const CURRENT_VERSION = 8;
const TOKEN_KEY = "admin_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
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
  const token = getToken();
  try {
    await fetch("/api/data/travel_all_markers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
export async function loadMarkersFromServer(): Promise<TravelMarker[]> {
  try {
    const res = await fetch("/api/data/travel_all_markers");
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) {
      return json.data;
    }
  } catch { /* 网络错误 */ }
  return [];
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
      } else {
        updated.push(def);
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
  if (stored.length === 0) {
    saveAllMarkers(travelMarkers);
    return travelMarkers;
  }
  return stored;
}
