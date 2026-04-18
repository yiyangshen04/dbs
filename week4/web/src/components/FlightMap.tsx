"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L, { DivIcon } from "leaflet";
import type { Flight, Observation } from "@/lib/types";

interface Props {
  flights: Flight[];
  selectedIcao?: string | null;
  onSelect?: (icao24: string) => void;
  history?: Observation[];
}

// US-centered default view.
const US_CENTER: [number, number] = [39.5, -98.35];
const US_ZOOM = 4;

function iconFor(flight: Flight, selected: boolean): DivIcon {
  const heading = flight.heading ?? 0;
  const color = selected ? "#f59e0b" : flight.on_ground ? "#64748b" : "#1e3a8a";
  const html = `
    <div style="transform: rotate(${heading}deg); transform-origin: center;">
      <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2 L13.5 10 L22 11.5 L22 13 L13.5 13.5 L12.5 21 L14 22 L14 22.5 L12 22 L10 22.5 L10 22 L11.5 21 L10.5 13.5 L2 13 L2 11.5 L10.5 10 Z"
              fill="${color}" stroke="#f8fafc" stroke-width="0.7" stroke-linejoin="round"/>
      </svg>
    </div>`;
  return L.divIcon({
    html,
    className: "plane-marker",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function FlightMap({
  flights,
  selectedIcao,
  onSelect,
  history,
}: Props) {
  // Path polyline from recent observations (oldest → newest).
  const pathPoints = useMemo(() => {
    if (!history) return [];
    return history
      .filter((o) => o.latitude != null && o.longitude != null)
      .map((o) => [o.latitude as number, o.longitude as number] as [number, number]);
  }, [history]);

  return (
    <MapContainer
      center={US_CENTER}
      zoom={US_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {pathPoints.length > 1 ? (
        <Polyline
          positions={pathPoints}
          pathOptions={{ color: "#f59e0b", weight: 3, opacity: 0.8 }}
        />
      ) : null}

      {flights.map((f) => {
        if (f.latitude == null || f.longitude == null) return null;
        const selected = f.icao24 === selectedIcao;
        return (
          <Marker
            key={f.icao24}
            position={[f.latitude, f.longitude]}
            icon={iconFor(f, selected)}
            eventHandlers={{
              click: () => onSelect?.(f.icao24),
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-mono font-semibold">
                  {f.callsign?.trim() || f.icao24}
                </div>
                <div>{f.origin_country ?? "Unknown"}</div>
                {f.baro_altitude != null ? (
                  <div>Alt: {Math.round(f.baro_altitude)} m</div>
                ) : null}
                {f.velocity != null ? (
                  <div>Speed: {Math.round(f.velocity)} m/s</div>
                ) : null}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
