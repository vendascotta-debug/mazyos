"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "@/components/LeafletMap";

// Leaflet toca `window` no import — só no cliente.
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-ink-100 text-sm text-ink-500">
      carregando mapa…
    </div>
  ),
});

export function MapPanel({
  points,
  center,
  radiusKm,
}: {
  points: MapPoint[];
  center: { lat: number; lng: number } | null;
  radiusKm: number | null;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-ink-200">
      <LeafletMap points={points} center={center} radiusKm={radiusKm} />
      <div className="pointer-events-none absolute bottom-3 left-3 z-[2] flex gap-3 rounded-lg bg-white/95 px-3 py-2 text-[11px] shadow-sm">
        {[
          ["A — prioridade máxima", "#059669"],
          ["B — bom potencial", "#0284c7"],
          ["C — médio", "#d97706"],
          ["D — baixo", "#94a3b8"],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5 text-ink-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
