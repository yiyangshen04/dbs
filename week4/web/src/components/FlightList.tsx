"use client";

import type { Flight } from "@/lib/types";

interface Props {
  flights: Flight[];
  selectedIcao?: string | null;
  onSelect: (icao24: string) => void;
}

export default function FlightList({ flights, selectedIcao, onSelect }: Props) {
  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {flights.slice(0, 300).map((f) => {
        const selected = f.icao24 === selectedIcao;
        return (
          <li key={f.icao24}>
            <button
              onClick={() => onSelect(f.icao24)}
              className={
                "w-full px-3 py-2 text-left text-sm transition " +
                (selected
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800")
              }
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono font-semibold">
                  {f.callsign?.trim() || f.icao24}
                </span>
                <span className="text-xs text-slate-500">
                  {f.baro_altitude != null
                    ? `${Math.round(f.baro_altitude)} m`
                    : f.on_ground
                      ? "ground"
                      : "—"}
                </span>
              </div>
              <div className="truncate text-xs text-slate-500">
                {f.origin_country ?? "Unknown"}
              </div>
            </button>
          </li>
        );
      })}
      {flights.length > 300 ? (
        <li className="px-3 py-2 text-center text-xs text-slate-500">
          {flights.length - 300} more — narrow your search to see them
        </li>
      ) : null}
    </ul>
  );
}
