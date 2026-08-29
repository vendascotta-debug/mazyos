"use client";

import { CircleMarker, Circle, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { TIER_DOT } from "@/components/ui";
import type { ScoreTier } from "@/lib/types";

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  score: number;
  tier: string;
  saved: boolean;
}

function FitBounds({ points, center, radiusKm }: { points: MapPoint[]; center: { lat: number; lng: number } | null; radiusKm: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (radiusKm && center) {
      // Enquadra exatamente o círculo do filtro de raio.
      const dLat = radiusKm / 111;
      const dLng = radiusKm / (111 * Math.cos((center.lat * Math.PI) / 180));
      map.fitBounds([
        [center.lat - dLat, center.lng - dLng],
        [center.lat + dLat, center.lng + dLng],
      ], { padding: [24, 24] });
      return;
    }
    if (points.length) {
      const lats = points.map((p) => p.lat);
      const lngs = points.map((p) => p.lng);
      map.fitBounds([
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ], { padding: [32, 32], maxZoom: 15 });
    }
  }, [map, points, center, radiusKm]);
  return null;
}

export default function LeafletMap({
  points,
  center,
  radiusKm,
}: {
  points: MapPoint[];
  center: { lat: number; lng: number } | null;
  radiusKm: number | null;
}) {
  const fallback = center ?? { lat: -23.55, lng: -46.63 };

  return (
    <MapContainer center={[fallback.lat, fallback.lng]} zoom={13} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} center={center} radiusKm={radiusKm} />

      {radiusKm && center && (
        <Circle
          center={[center.lat, center.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#f97316", weight: 1.5, fillColor: "#f97316", fillOpacity: 0.06 }}
        />
      )}

      {points.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={p.score >= 75 ? 9 : p.score >= 55 ? 7.5 : 6}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: TIER_DOT[p.tier as ScoreTier] ?? "#94a3b8",
            fillOpacity: p.saved ? 1 : 0.85,
            dashArray: p.saved ? undefined : undefined,
          }}
        >
          <Popup>
            <div className="min-w-44">
              <p className="font-semibold text-ink-900">{p.name}</p>
              <p className="mt-0.5 text-xs text-ink-500">
                Lead Score {p.score} · classe {p.tier}
                {p.saved && " · já salvo"}
              </p>
              <Link href={`/empresa/${p.id}`} className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline">
                Ver ficha completa →
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
