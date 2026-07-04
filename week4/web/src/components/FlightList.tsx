"use client";

import type { Flight } from "@/lib/types";
import { altitudeColor, fmtFeet, fmtKnots } from "@/lib/altitude";

interface Props {
  flights: Flight[];
  selectedIcao?: string | null;
  onSelect: (icao24: string) => void;
}

const MAX_LISTED = 300;

export default function FlightList({ flights, selectedIcao, onSelect }: Props) {
  return (
    <ul className="divide-y divide-panel-border/60">
      {flights.slice(0, MAX_LISTED).map((f) => {
        const selected = f.icao24 === selectedIcao;
        return (
          <li key={f.icao24}>
            <button
              onClick={() => onSelect(f.icao24)}
              className={
                "w-full px-3 py-2 text-left text-sm transition " +
                (selected
                  ? "bg-selection/15 shadow-[inset_2px_0_0_0_var(--selection)]"
                  : "hover:bg-white/5")
              }
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background: altitudeColor(f.baro_altitude, f.on_ground),
                  }}
                />
                <span className="font-mono font-semibold">
                  {f.callsign?.trim() || f.icao24}
                </span>
                <span className="ml-auto font-mono text-[11px] text-muted">
                  {f.on_ground ? "GND" : fmtFeet(f.baro_altitude)}
                </span>
              </div>
              <div className="mt-0.5 flex justify-between pl-4 text-[11px] text-muted">
                <span className="truncate">{f.origin_country ?? "Other"}</span>
                <span className="font-mono">{fmtKnots(f.velocity)}</span>
              </div>
            </button>
          </li>
        );
      })}
      {flights.length > MAX_LISTED ? (
        <li className="px-3 py-2 text-center text-xs text-muted">
          {(flights.length - MAX_LISTED).toLocaleString()} more — narrow your
          search to see them
        </li>
      ) : null}
    </ul>
  );
}
