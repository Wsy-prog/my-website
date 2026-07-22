"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TravelMarker } from "@/data/travel-markers";

/** 内联 SVG 图钉，不依赖外部请求 */
function makeIcon(selected: boolean) {
  const s = selected ? 42 : 28; // SVG viewport size
  const fill = selected ? "#ec4899" : "#1296db"; // 选中态粉红，常态蓝
  const shadow = selected
    ? "drop-shadow(0 3px 6px rgba(0,0,0,0.45)) drop-shadow(0 0 8px rgba(251,191,36,0.7))"
    : "drop-shadow(0 2px 4px rgba(0,0,0,0.35))";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${s}" height="${s}"><path d="M512 42.8c-194.4 0-352 157.6-352 352 0 110.6 51 209.2 130.7 273.8C351.2 717.4 512 981.4 512 981.4s161.2-264.1 221.7-313.3c79.5-64.5 130.3-163 130.3-273.4 0-194.4-157.6-351.9-352-351.9z m0 469.3c-64.8 0-117.3-52.5-117.3-117.3S447.2 277.4 512 277.4s117.3 52.5 117.3 117.3S576.8 512.1 512 512.1z" fill="${fill}"/></svg>`;
  return L.divIcon({
    className: "",
    html: `<div style="filter:${shadow};transform:translate(-50%,-100%);">${svg}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export default function TravelMap({ markers, selectedId, onSelect }: {
  markers: TravelMarker[]; selectedId: number | null; onSelect: (m: TravelMarker) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerMap = useRef<Map<number, L.Marker>>(new Map());
  const prevCount = useRef(0);
  const cbRef = useRef(onSelect);
  cbRef.current = onSelect;

  useEffect(() => {
    const div = divRef.current;
    if (!div || mapRef.current) return;
    const map = L.map(div, { center: [35, 110], zoom: 5, scrollWheelZoom: true, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    map.getContainer().querySelectorAll(".leaflet-pane").forEach((p: any) => { p.style.zIndex = "5"; });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerMap.current.clear(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(markers.map(m => m.id));
    for (const [id, mk] of markerMap.current) {
      if (!currentIds.has(id)) { mk.remove(); markerMap.current.delete(id); }
    }

    for (const m of markers) {
      const isSelected = selectedId === m.id;
      const icon = makeIcon(isSelected);

      let existing = markerMap.current.get(m.id);
      if (existing) {
        existing.setLatLng([m.lat, m.lng]);
        existing.setIcon(icon);
      } else {
        const mk = L.marker([m.lat, m.lng], { icon }).addTo(map);
        mk.bindPopup(`${m.photo} ${m.title}`);
        mk.on("click", () => cbRef.current(m));
        markerMap.current.set(m.id, mk);
      }
    }

    // 只在标记数量变化时调整视野
    if (markers.length > 0 && prevCount.current !== markers.length) {
      const b = L.latLngBounds(markers.map(m => [m.lat, m.lng] as [number, number]));
      if (b.isValid()) map.fitBounds(b, { padding: [30, 30], maxZoom: 12 });
    }
    prevCount.current = markers.length;
  }, [markers, selectedId]);

  return <div ref={divRef} className="h-full w-full" />;
}
