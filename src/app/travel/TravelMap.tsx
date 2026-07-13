"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TravelMarker } from "@/data/travel-markers";

const defIcon = L.icon({ iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png", iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34] });
const selIcon = L.icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png", shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png", iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34] });

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
    const map = L.map(div, { center: [35,110], zoom: 5, scrollWheelZoom: true, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    map.getContainer().querySelectorAll(".leaflet-pane").forEach((p: any) => { p.style.zIndex = "5"; });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerMap.current.clear(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const current = new Set(markers.map(m => m.id));
    for (const [id, mk] of markerMap.current) {
      if (!current.has(id)) { mk.remove(); markerMap.current.delete(id); }
    }

    for (const m of markers) {
      let existing = markerMap.current.get(m.id);
      if (existing) {
        existing.setLatLng([m.lat, m.lng]);
        // 选中高亮
        let icon: any = selectedId === m.id ? selIcon : defIcon;
        if (m.type === "home") icon = L.divIcon({ className: "", html: '<div style="font-size:28px;transform:translate(-50%,-100%)">🏠</div>', iconSize: [0,0], iconAnchor: [0,0] });
        else if (m.type === "residence") icon = L.divIcon({ className: "", html: '<div style="font-size:28px;transform:translate(-50%,-100%)">🏡</div>', iconSize: [0,0], iconAnchor: [0,0] });
        existing.setIcon(icon as any);
      } else {
        let icon: any = selectedId === m.id ? selIcon : defIcon;
        if (m.type === "home") icon = L.divIcon({ className: "", html: '<div style="font-size:28px;transform:translate(-50%,-100%)">🏠</div>', iconSize: [0,0], iconAnchor: [0,0] });
        else if (m.type === "residence") icon = L.divIcon({ className: "", html: '<div style="font-size:28px;transform:translate(-50%,-100%)">🏡</div>', iconSize: [0,0], iconAnchor: [0,0] });
        const mk = L.marker([m.lat, m.lng], { icon: icon as any }).addTo(map);
        mk.bindPopup(`${m.photo} ${m.title}`);
        mk.on("click", () => cbRef.current(m));
        markerMap.current.set(m.id, mk);
      }
    }

    // 只在标记数量变化时调整视野
    if (markers.length > 0 && prevCount.current !== markers.length) {
      const b = L.latLngBounds(markers.map(m => [m.lat, m.lng] as [number, number]));
      if (b.isValid()) map.fitBounds(b, { padding: [30,30], maxZoom: 12 });
    }
    prevCount.current = markers.length;
  }, [markers, selectedId]);

  return <div ref={divRef} className="h-full w-full" />;
}
