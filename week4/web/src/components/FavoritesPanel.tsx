"use client";

import type { Favorite } from "@/lib/use-favorites";
import type { Flight } from "@/lib/types";

interface Props {
  favorites: Favorite[];
  flights: Map<string, Flight>;
  onSelect: (icao24: string) => void;
}

export default function FavoritesPanel({ favorites, flights, onSelect }: Props) {
  if (favorites.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No favorites yet. Open a flight&apos;s detail panel and tap <strong>Save</strong>.
      </p>
    );
  }

  // Map each saved callsign to a live flight (if currently visible).
  // A callsign may not currently be airborne over the US → we mark those dim.
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
                (live
                  ? "hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  : "opacity-50 cursor-not-allowed")
              }
              title={live ? "Click to focus on the map" : "Not currently visible"}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono font-semibold">{fav.callsign}</span>
                <span className="text-[10px] text-slate-500">
                  {live
                    ? live.on_ground
                      ? "ground"
                      : live.baro_altitude != null
                        ? `${Math.round(live.baro_altitude)} m`
                        : "airborne"
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
