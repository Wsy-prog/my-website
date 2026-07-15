import { travelMarkers, type TravelMarker } from "@/data/travel-markers";

const MARKERS_KEY = "travel_all_markers";

/** 获取所有旅行地点——默认值从源代码读取，自定义数据从 localStorage 合并 */
export function getAllMarkers(): TravelMarker[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MARKERS_KEY);
      if (raw) {
        const local = JSON.parse(raw) as TravelMarker[];
        if (local.length > 0) return local;
      }
    } catch {}
  }
  return travelMarkers;
}

/** 保存旅行地点（本地 + 服务端） */
export function saveAllMarkers(markers: TravelMarker[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MARKERS_KEY, JSON.stringify(markers));
    const token = localStorage.getItem("admin_token");
    fetch("/api/data/travel_all_markers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data: markers }),
    }).catch(() => {});
  } catch { /* quota */ }
}
