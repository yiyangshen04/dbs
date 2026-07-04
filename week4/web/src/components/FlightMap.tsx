"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L, { DivIcon } from "leaflet";
import type { Flight, Observation } from "@/lib/types";
import {
  ALTITUDE_BANDS,
  GROUND_COLOR,
  altitudeBandIndex,
  altitudeColor,
  fmtFeet,
  fmtKnots,
} from "@/lib/altitude";

interface Props {
  flights: Flight[];
  selectedIcao?: string | null;
  onSelect?: (icao24: string) => void;
  history?: Observation[];
}

const REGIONS = {
  CONUS: { center: [39.5, -98.35] as [number, number], zoom: 4 },
  Alaska: { center: [62.5, -152.0] as [number, number], zoom: 4 },
  Hawaii: { center: [20.9, -157.3] as [number, number], zoom: 6 },
};

// Keep the DOM sane at low zoom; the counter overlay tells the user to
// zoom in when the cap kicks in.
const MAX_MARKERS = 1500;

// Ingest lands about once a minute, so we animate markers between updates
// by dead-reckoning along heading at ground speed.
const EXTRAPOLATE_TICK_MS = 1_000;
const MAX_EXTRAPOLATE_S = 180;

const AIRLINER_PATH =
  "M12 1.5c.6 0 1.1 1 1.3 2.2l.5 5.1 7.6 4.4c.4.2.6.6.6 1v1.3l-8-2.3-.4 4.9 2.3 1.7c.2.15.3.4.3.6v1l-3.6-.9-.6 1.4-.6-1.4-3.6.9v-1c0-.25.1-.5.3-.6l2.3-1.7-.4-4.9-8 2.3v-1.3c0-.4.2-.8.6-1l7.6-4.4.5-5.1C10.9 2.5 11.4 1.5 12 1.5z";

// divIcons are DOM nodes — building one per marker per render melts the
// GC. Cache by (heading bucket, altitude band, selected); ~500 entries max.
const iconCache = new Map<string, DivIcon>();

function iconFor(flight: Flight, selected: boolean): DivIcon {
  const headingBucket = Math.round((flight.heading ?? 0) / 10) * 10;
  const band = altitudeBandIndex(flight.baro_altitude, flight.on_ground);
  const key = `${headingBucket}|${band}|${selected ? 1 : 0}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const color = selected
    ? "#fbbf24"
    : altitudeColor(flight.baro_altitude, flight.on_ground);
  const size = selected ? 30 : 22;
  const html = `
    <div style="transform: rotate(${headingBucket}deg); transform-origin: center;">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="${AIRLINER_PATH}" fill="${color}" stroke="#020617" stroke-width="0.6" stroke-linejoin="round"/>
      </svg>
    </div>`;
  const icon = L.divIcon({
    html,
    className: "plane-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

// Project a moving aircraft forward from its last reported fix.
function displayPosition(f: Flight, nowMs: number): [number, number] | null {
  if (f.latitude == null || f.longitude == null) return null;
  if (
    f.on_ground ||
    f.velocity == null ||
    f.velocity < 20 ||
    f.heading == null
  ) {
    return [f.latitude, f.longitude];
  }
  const dt = (nowMs - Date.parse(f.last_seen)) / 1000;
  if (!Number.isFinite(dt) || dt <= 0 || dt > MAX_EXTRAPOLATE_S) {
    return [f.latitude, f.longitude];
  }
  const rad = (f.heading * Math.PI) / 180;
  const dist = f.velocity * dt; // meters
  const dLat = (dist * Math.cos(rad)) / 111_320;
  const cosLat = Math.cos((f.latitude * Math.PI) / 180);
  if (Math.abs(cosLat) < 1e-6) return [f.latitude, f.longitude];
  const dLon = (dist * Math.sin(rad)) / (111_320 * cosLat);
  return [f.latitude + dLat, f.longitude + dLon];
}

// Lives inside MapContainer so it can reach the Leaflet map via useMap().
function BoundsTracker({
  onBoundsChange,
}: {
  onBoundsChange: (b: L.LatLngBounds) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onBoundsChange(map.getBounds());
    // Initial capture deferred so React isn't mid-render in the parent.
    const initial = setTimeout(handler, 0);
    map.on("moveend", handler);
    map.on("zoomend", handler);
    return () => {
      clearTimeout(initial);
      map.off("moveend", handler);
      map.off("zoomend", handler);
    };
  }, [map, onBoundsChange]);
  return null;
}

function RegionButtons() {
  const map = useMap();
  return (
    <div className="glass-panel absolute right-3 top-3 z-[1000] flex overflow-hidden !rounded-full text-[11px] font-medium">
      {(Object.keys(REGIONS) as Array<keyof typeof REGIONS>).map((name) => (
        <button
          key={name}
          onClick={() => {
            const r = REGIONS[name];
            map.flyTo(r.center, r.zoom, { duration: 1.2 });
          }}
          className="px-3 py-1.5 text-foreground/80 transition hover:bg-white/10 hover:text-foreground"
        >
          {name}
        </button>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="glass-panel absolute bottom-6 left-3 z-[1000] px-3 py-2">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted">
        Altitude
      </div>
      <div className="flex items-center gap-2">
        {[{ color: GROUND_COLOR, label: "ground" }, ...ALTITUDE_BANDS].map(
          (b) => (
            <div key={b.label} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: b.color }}
              />
              <span className="text-[9px] text-muted">{b.label}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export default function FlightMap({
  flights,
  selectedIcao,
  onSelect,
  history,
}: Props) {
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), EXTRAPOLATE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Track polyline segments from recent observations, colored by altitude.
  const trailSegments = useMemo(() => {
    if (!history) return [];
    const pts = history.filter((o) => o.latitude != null && o.longitude != null);
    const segments: Array<{
      positions: [number, number][];
      color: string;
      key: number;
    }> = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      segments.push({
        positions: [
          [a.latitude as number, a.longitude as number],
          [b.latitude as number, b.longitude as number],
        ],
        color: altitudeColor(b.baro_altitude, b.on_ground),
        key: i,
      });
    }
    return segments;
  }, [history]);

  // Render markers only inside the viewport (plus the selected aircraft so
  // sidebar focus works when it's off-screen), capped for DOM sanity.
  const { visibleFlights, hiddenCount } = useMemo(() => {
    let inView = flights.filter((f) => {
      if (f.latitude == null || f.longitude == null) return false;
      if (f.icao24 === selectedIcao) return true;
      return bounds ? bounds.contains([f.latitude, f.longitude]) : true;
    });
    const hidden = Math.max(0, inView.length - MAX_MARKERS);
    if (hidden > 0) {
      // Prefer airborne traffic when thinning.
      inView = inView
        .slice()
        .sort((a, b) => Number(a.on_ground) - Number(b.on_ground))
        .slice(0, MAX_MARKERS);
    }
    return { visibleFlights: inView, hiddenCount: hidden };
  }, [flights, bounds, selectedIcao]);

  return (
    <MapContainer
      center={REGIONS.CONUS.center}
      zoom={REGIONS.CONUS.zoom}
      minZoom={3}
      scrollWheelZoom
      className="h-full w-full !bg-background"
      preferCanvas
    >
      <BoundsTracker onBoundsChange={setBounds} />
      <RegionButtons />
      <Legend />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />

      {hiddenCount > 0 ? (
        <div className="glass-panel absolute bottom-6 right-3 z-[1000] px-3 py-1.5 text-[10px] text-muted">
          {hiddenCount.toLocaleString()} aircraft hidden — zoom in
        </div>
      ) : null}

      {trailSegments.map((s) => (
        <Polyline
          key={s.key}
          positions={s.positions}
          pathOptions={{ color: s.color, weight: 2.5, opacity: 0.85 }}
        />
      ))}

      {visibleFlights.map((f) => {
        const pos = displayPosition(f, nowMs);
        if (!pos) return null;
        const selected = f.icao24 === selectedIcao;
        return (
          <Marker
            key={f.icao24}
            position={pos}
            icon={iconFor(f, selected)}
            zIndexOffset={selected ? 1000 : 0}
            eventHandlers={{
              click: () => onSelect?.(f.icao24),
            }}
          >
            <Popup>
              <div className="min-w-36 text-xs">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="font-mono text-sm font-semibold">
                    {f.callsign?.trim() || f.icao24}
                  </span>
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      background: altitudeColor(f.baro_altitude, f.on_ground),
                    }}
                  />
                </div>
                <div className="text-muted">{f.origin_country ?? "Other"}</div>
                <div className="mt-1 grid grid-cols-2 gap-x-3 font-mono">
                  <span>{f.on_ground ? "GROUND" : fmtFeet(f.baro_altitude)}</span>
                  <span>{fmtKnots(f.velocity)}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
