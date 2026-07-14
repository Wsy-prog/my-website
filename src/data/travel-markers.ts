export interface TravelMarker {
  id: number;
  lat: number;
  lng: number;
  title: string;
  date: string;       // 起始日期 YYYY-MM 或 YYYY-MM-DD
  endDate?: string;    // 结束日期（选填）
  photo: string;
  description?: string;
  blogSlugs?: string[];
  type?: "home" | "residence" | "travel"; // 特殊标记类型
  groupId?: number; // 指向主标记（同一地点多个标记）
}

export const travelMarkers: TravelMarker[] = [
  { id: 30, lat: 19.61, lng: 110.75, title: "家 · 海南文昌", date: "", photo: "🏠", type: "home" },
  { id: 31, lat: 31.82, lng: 117.23, title: "现居 · 安徽合肥", date: "2023-至今", photo: "🏡", type: "residence" },
];
