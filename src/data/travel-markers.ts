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
  { id: 20, lat: 31.62, lng: 117.89, title: "巢湖", date: "2026-07", photo: "🌊" },
  { id: 25, lat: 36.65, lng: 117.0, title: "济南", date: "2026-07", photo: "🏯" },
  { id: 1, lat: 22.54, lng: 114.06, title: "深圳", date: "2026-06", photo: "🏙️" },
  { id: 2, lat: 27.2, lng: 115.8, title: "江西乐安", date: "2026-06", photo: "🏞️" },
  { id: 3, lat: 30.0, lng: 117.98, title: "安徽宏村", date: "2026-04", photo: "🏡" },
  { id: 19, lat: 28.23, lng: 112.94, title: "湖南长沙", date: "2026-04", photo: "🌶️" },
  { id: 4, lat: 29.56, lng: 106.55, title: "重庆", date: "2025-11", photo: "🌆" },
  { id: 17, lat: 36.26, lng: 117.11, title: "泰山", date: "2025-11", photo: "⛰️" },
  { id: 16, lat: 34.26, lng: 117.18, title: "徐州", date: "2025-11", photo: "🏛️" },
  { id: 5, lat: -33.87, lng: 151.21, title: "悉尼", date: "2025-08", photo: "🏙️" },
  { id: 21, lat: -34.43, lng: 150.89, title: "伍伦贡", date: "2025-08", photo: "🌊", groupId: 5 },
  { id: 22, lat: -37.81, lng: 144.96, title: "墨尔本", date: "2025-08", photo: "☕", groupId: 5 },
  { id: 6, lat: 24.48, lng: 118.09, title: "厦门", date: "2025-08", photo: "🌊" },
  { id: 7, lat: 22.28, lng: 114.17, title: "香港", date: "2025-07", photo: "🌃" },
  { id: 18, lat: 23.13, lng: 113.26, title: "广州", date: "2025-07", photo: "🏙️" },
  { id: 9, lat: 32.06, lng: 118.80, title: "南京", date: "2025-04", photo: "🏛️" },
  { id: 11, lat: 30.57, lng: 104.07, title: "四川成都", date: "2024-11", photo: "🐼" },
  { id: 24, lat: 31.47, lng: 104.68, title: "四川绵阳", date: "2024-11", photo: "🏞️" },
  { id: 10, lat: 23.03, lng: 113.75, title: "东莞", date: "2024-11", photo: "🏭" },
  { id: 12, lat: 18.77, lng: 109.52, title: "海南五指山", date: "2024-08", photo: "🌴" },
  { id: 23, lat: 30.59, lng: 114.31, title: "武汉", date: "2024-05-01", photo: "🏗️" },
  { id: 13, lat: 36.41, lng: 119.10, title: "山东潍坊安丘", date: "2024-01", photo: "🏮" },
  { id: 14, lat: 39.91, lng: 116.40, title: "北京", date: "2023-10", photo: "🏯" },
  { id: 15, lat: 19.71, lng: 109.16, title: "海南儋州海花岛", date: "2023-07", photo: "🏝️" },
];
