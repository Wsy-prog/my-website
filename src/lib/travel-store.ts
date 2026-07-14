import { travelMarkers, type TravelMarker } from "@/data/travel-markers";

const MARKERS_KEY = "travel_all_markers";

/** 获取所有旅行地点——直接从源代码读取 */
export function getAllMarkers(): TravelMarker[] {
  return travelMarkers;
}

/** 管理面板保存旅行地点（仅影响本地缓存） */
export function saveAllMarkers(markers: TravelMarker[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MARKERS_KEY, JSON.stringify(markers));
  } catch { /* quota */ }
}
