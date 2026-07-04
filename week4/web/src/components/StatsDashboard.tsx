"use client";

import { useEffect, useMemo, useState } from "react";
import type { Flight, StatsOverview } from "@/lib/types";
import { ALTITUDE_BANDS, MPS_TO_KT } from "@/lib/altitude";

interface Props {
  flights: Flight[];
}

// Live numbers come straight from the in-memory flight map; history-derived
// numbers (unique aircraft, sample count) come from the stats_overview()
// Postgres function, refreshed every minute.
const SERVER_STATS_MS = 60_000;

export default function StatsDashboard({ flights }: Props) {
  const [server, setServer] = useState<StatsOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/stats/today")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((data: StatsOverview) => {
          if (!cancelled && data && typeof data === "object") setServer(data);
        })
        .catch(() => undefined);
    load();
    const id = setInterval(load, SERVER_STATS_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const live = useMemo(() => {
    let airborne = 0;
    let speedSum = 0;
    let speedCount = 0;
    const byCountry = new Map<string, number>();
    const buckets = new Array<number>(ALTITUDE_BANDS.length).fill(0);

    for (const f of flights) {
      if (!f.on_ground) airborne += 1;
      if (f.velocity != null && !f.on_ground) {
        speedSum += f.velocity;
        speedCount += 1;
      }
      byCountry.set(
        f.origin_country ?? "Other",
        (byCountry.get(f.origin_country ?? "Other") ?? 0) + 1,
      );
      if (!f.on_ground && f.baro_altitude != null) {
        let idx = 0;
        for (let i = 0; i < ALTITUDE_BANDS.length; i++) {
          if (f.baro_altitude >= ALTITUDE_BANDS[i].minM) idx = i;
        }
        buckets[idx] += 1;
      }
    }

    return {
      total: flights.length,
      airborne,
      avgSpeedKt: speedCount ? (speedSum / speedCount) * MPS_TO_KT : 0,
      topCountries: [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      buckets,
      bucketMax: Math.max(1, ...buckets),
    };
  }, [flights]);

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <Kpi label="Airborne" value={live.airborne.toLocaleString()} />
      <Kpi
        label="On ground"
        value={(live.total - live.airborne).toLocaleString()}
      />
      <Kpi label="Avg speed" value={`${Math.round(live.avgSpeedKt)} kt`} />
      <Kpi
        label="Seen (3 h)"
        value={server ? server.unique_aircraft_3h.toLocaleString() : "—"}
        title="Unique aircraft in the observation history"
      />

      <section className="col-span-2 mt-1">
        <h3 className="mb-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted">
          Altitude distribution
        </h3>
        <div className="flex h-16 items-end gap-1">
          {ALTITUDE_BANDS.map((b, i) => {
            const count = live.buckets[i] ?? 0;
            const h = (count / live.bucketMax) * 100;
            return (
              <div
                key={b.label}
                className="flex h-full flex-1 flex-col items-center justify-end"
                title={`${b.label}: ${count}`}
              >
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${h}%`,
                    minHeight: count > 0 ? "2px" : "0",
                    background: b.color,
                    opacity: 0.85,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[8px] text-muted">
          <span>{ALTITUDE_BANDS[0].label}</span>
          <span>{ALTITUDE_BANDS[ALTITUDE_BANDS.length - 1].label}</span>
        </div>
      </section>

      <section className="col-span-2 mt-1">
        <h3 className="mb-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted">
          Registration country
        </h3>
        <ol className="space-y-0.5 text-xs">
          {live.topCountries.map(([country, count]) => (
            <li key={country} className="flex items-center gap-2">
              <span className="truncate text-foreground/80">{country}</span>
              <span className="mx-1 flex-1 border-b border-dotted border-panel-border" />
              <span className="font-mono text-muted">{count.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div
      className="rounded-lg border border-panel-border bg-background/60 px-2.5 py-1.5"
      title={title}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div className="font-mono text-base leading-tight">{value}</div>
    </div>
  );
}
