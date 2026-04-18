"use client";

import { useEffect, useState } from "react";
import type { Flight, Observation } from "@/lib/types";
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

  // Parent remounts this component on flight change (via `key`), so the initial
  // useState values above are always fresh — no need to reset inside the effect.
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

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <header className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="font-mono text-lg font-semibold">
            {flight.callsign?.trim() || flight.icao24}
          </h2>
          <p className="text-xs text-slate-500">
            {flight.origin_country ?? "Unknown"} · {flight.icao24}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {favoriteControl}
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs
                       hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Altitude" value={fmt(flight.baro_altitude, "m")} />
        <Stat label="Speed" value={fmt(flight.velocity, "m/s")} />
        <Stat label="Heading" value={fmt(flight.heading, "°")} />
        <Stat label="Vertical rate" value={fmt(flight.vertical_rate, "m/s")} />
        <Stat label="Lat" value={fmt(flight.latitude, "°", 3)} />
        <Stat label="Lon" value={fmt(flight.longitude, "°", 3)} />
        <Stat label="On ground" value={flight.on_ground ? "yes" : "no"} />
        <Stat label="Last seen" value={relTime(flight.last_seen)} />
      </dl>

      <section className="mt-4">
        <h3 className="mb-1 text-xs uppercase tracking-wider text-slate-500">
          Altitude — recent
        </h3>
        {history === null && !error ? (
          <p className="text-xs text-slate-400">Loading history…</p>
        ) : error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : history && history.length === 0 ? (
          <p className="text-xs text-slate-400">No history yet for this aircraft.</p>
        ) : history ? (
          <AltitudeChart observations={history} />
        ) : null}
      </section>

      {history && history.length > 0 ? (
        <section className="mt-4">
          <h3 className="mb-1 text-xs uppercase tracking-wider text-slate-500">
            Speed — recent
          </h3>
          <VelocityChart observations={history} />
        </section>
      ) : null}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1 dark:bg-slate-900">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}

function fmt(v: number | null, unit: string, digits = 0): string {
  if (v == null) return "—";
  return `${v.toFixed(digits)} ${unit}`;
}

function relTime(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
