"use client";

import { useMemo } from "react";
import type { Flight } from "@/lib/types";

interface Props {
  flights: Flight[];
}

const ALT_BUCKETS: Array<{ label: string; max: number }> = [
  { label: "0–1 km", max: 1000 },
  { label: "1–3 km", max: 3000 },
  { label: "3–6 km", max: 6000 },
  { label: "6–9 km", max: 9000 },
  { label: "9–12 km", max: 12_000 },
  { label: "12 km+", max: Infinity },
];

export default function StatsDashboard({ flights }: Props) {
  const stats = useMemo(() => {
    let airborne = 0;
    let speedSum = 0;
    let speedCount = 0;
    const byCountry = new Map<string, number>();
    const buckets = new Array<number>(ALT_BUCKETS.length).fill(0);

    for (const f of flights) {
      if (!f.on_ground) airborne += 1;
      if (f.velocity != null) {
        speedSum += f.velocity;
        speedCount += 1;
      }
      const country = f.origin_country ?? "Unknown";
      byCountry.set(country, (byCountry.get(country) ?? 0) + 1);
      if (f.baro_altitude != null) {
        const i = ALT_BUCKETS.findIndex((b) => f.baro_altitude! < b.max);
        if (i >= 0) buckets[i] = (buckets[i] ?? 0) + 1;
      }
    }

    const topCountries = [...byCountry.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const bucketMax = Math.max(1, ...buckets);

    return {
      total: flights.length,
      airborne,
      avgSpeed: speedCount ? speedSum / speedCount : 0,
      topCountries,
      buckets,
      bucketMax,
    };
  }, [flights]);

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <Kpi label="Airborne" value={stats.airborne.toLocaleString()} />
      <Kpi label="On ground" value={(stats.total - stats.airborne).toLocaleString()} />
      <Kpi label="Avg speed" value={`${Math.round(stats.avgSpeed)} m/s`} />
      <Kpi label="Tracked now" value={stats.total.toLocaleString()} />

      <section className="col-span-2 mt-2">
        <h3 className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">
          Altitude distribution
        </h3>
        <div className="flex items-end gap-1 h-20">
          {ALT_BUCKETS.map((b, i) => {
            const h = ((stats.buckets[i] ?? 0) / stats.bucketMax) * 100;
            return (
              <div
                key={b.label}
                className="flex flex-1 flex-col items-center justify-end"
                title={`${b.label}: ${stats.buckets[i] ?? 0}`}
              >
                <div
                  className="w-full rounded-t bg-blue-900"
                  style={{ height: `${h}%`, minHeight: (stats.buckets[i] ?? 0) > 0 ? "2px" : "0" }}
                />
                <div className="mt-0.5 text-[9px] text-slate-500 whitespace-nowrap">{b.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="col-span-2 mt-2">
        <h3 className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">
          Top origin countries
        </h3>
        <ol className="space-y-0.5 text-xs">
          {stats.topCountries.map(([country, count]) => (
            <li key={country} className="flex justify-between">
              <span className="truncate">{country}</span>
              <span className="font-mono text-slate-500">{count}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-mono text-base">{value}</div>
    </div>
  );
}
