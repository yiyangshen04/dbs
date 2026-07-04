"use client";

import { useEffect, useState } from "react";
import type { Flight, Observation } from "@/lib/types";
import { M_TO_FT, MPS_TO_KT, altitudeColor } from "@/lib/altitude";
import AltitudeChart from "./AltitudeChart";
import VelocityChart from "./VelocityChart";

interface Props {
  flight: Flight;
  onClose: () => void;
  onHistoryLoaded?: (obs: Observation[]) => void;
  favoriteControl?: React.ReactNode;
}

export default function FlightDetailPanel({
  flight,
  onClose,
  onHistoryLoaded,
  favoriteControl,
}: Props) {
  const [history, setHistory] = useState<Observation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parent remounts this component on flight change (via `key`), so the
  // initial state above is always fresh.
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/history/${flight.icao24}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { observations: Observation[] }) => {
        setHistory(data.observations);
        onHistoryLoaded?.(data.observations);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [flight.icao24, onHistoryLoaded]);

  const accent = altitudeColor(flight.baro_altitude, flight.on_ground);

  return (
    <aside className="flex h-full flex-col overflow-y-auto p-4">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: accent }}
            />
            <h2 className="font-mono text-xl font-semibold tracking-tight">
              {flight.callsign?.trim() || flight.icao24}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {flight.origin_country ?? "Other"} · <span className="font-mono">{flight.icao24}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {favoriteControl}
          <button
            onClick={onClose}
            aria-label="Close details"
            className="rounded-md border border-panel-border px-2 py-1 text-xs text-muted transition hover:bg-white/5 hover:text-foreground"
          >
            ✕
          </button>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Stat
          label="Altitude"
          value={
            flight.on_ground
              ? "on ground"
              : flight.baro_altitude != null
                ? `${fmtNum(flight.baro_altitude * M_TO_FT)} ft`
                : "—"
          }
          sub={
            !flight.on_ground && flight.baro_altitude != null
              ? `${fmtNum(flight.baro_altitude)} m`
              : undefined
          }
        />
        <Stat
          label="Ground speed"
          value={
            flight.velocity != null
              ? `${Math.round(flight.velocity * MPS_TO_KT)} kt`
              : "—"
          }
          sub={flight.velocity != null ? `${Math.round(flight.velocity)} m/s` : undefined}
        />
        <Stat
          label="Heading"
          value={flight.heading != null ? `${Math.round(flight.heading)}°` : "—"}
        />
        <Stat
          label="Vertical rate"
          value={
            flight.vertical_rate != null
              ? `${flight.vertical_rate > 0 ? "▲" : flight.vertical_rate < 0 ? "▼" : ""} ${fmtNum(Math.abs(flight.vertical_rate * M_TO_FT * 60))} fpm`
              : "—"
          }
          sub={
            flight.vertical_rate != null
              ? `${flight.vertical_rate.toFixed(1)} m/s`
              : undefined
          }
        />
        <Stat
          label="Position"
          value={
            flight.latitude != null && flight.longitude != null
              ? `${flight.latitude.toFixed(3)}, ${flight.longitude.toFixed(3)}`
              : "—"
          }
        />
        <Stat label="Last signal" value={relTime(flight.last_seen)} />
      </dl>

      <section className="mt-5">
        <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
          Altitude — last 2 h
        </h3>
        {history === null && !error ? (
          <p className="text-xs text-muted">Loading history…</p>
        ) : error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : history && history.length === 0 ? (
          <p className="text-xs text-muted">No history yet for this aircraft.</p>
        ) : history ? (
          <AltitudeChart observations={history} />
        ) : null}
      </section>

      {history && history.length > 0 ? (
        <section className="mt-4">
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
            Ground speed — last 2 h
          </h3>
          <VelocityChart observations={history} />
        </section>
      ) : null}
    </aside>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-panel-border bg-background/60 px-2.5 py-1.5">
      <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd className="font-mono text-sm">{value}</dd>
      {sub ? <dd className="font-mono text-[10px] text-muted">{sub}</dd> : null}
    </div>
  );
}

function fmtNum(v: number): string {
  return Math.round(v).toLocaleString();
}

function relTime(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
