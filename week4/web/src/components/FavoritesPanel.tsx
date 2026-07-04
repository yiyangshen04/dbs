"use client";

import type { Favorite } from "@/lib/use-favorites";
import type { Flight } from "@/lib/types";
import { fmtFeet } from "@/lib/altitude";

interface Props {
  favorites: Favorite[];
  flights: Map<string, Flight>;
  onSelect: (icao24: string) => void;
}

export default function FavoritesPanel({ favorites, flights, onSelect }: Props) {
  if (favorites.length === 0) {
    return (
      <p className="text-xs text-muted">
        No favorites yet. Open a flight&apos;s detail panel and tap{" "}
        <strong className="text-foreground/80">☆ Save</strong>.
      </p>
    );
  }

  // Map each saved callsign to a live flight (if currently visible).
  const byCallsign = new Map<string, Flight>();
  for (const f of flights.values()) {
    if (f.callsign) byCallsign.set(f.callsign.trim(), f);
  }

  return (
    <ul className="space-y-1 text-sm">
      {favorites.map((fav) => {
        const live = byCallsign.get(fav.callsign);
        return (
          <li key={fav.id}>
            <button
              onClick={() => live && onSelect(live.icao24)}
              disabled={!live}
              className={
                "w-full rounded-md px-2 py-1 text-left transition " +
                (live ? "hover:bg-white/5" : "cursor-not-allowed opacity-40")
              }
              title={live ? "Click to focus on the map" : "Not currently in the air"}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono font-semibold">
                  <span className="mr-1 text-selection">★</span>
                  {fav.callsign}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {live
                    ? live.on_ground
                      ? "GND"
                      : fmtFeet(live.baro_altitude)
                    : "offline"}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
