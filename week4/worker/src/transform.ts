import type { TimedAircraft } from "./sources.js";
import { MAX_STATE_AGE_SECONDS } from "./config.js";
import { countryForIcao } from "./icao-country.js";

export interface FlightRow {
  icao24: string;
  callsign: string | null;
  origin_country: string | null;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;   // meters (converted from feet)
  velocity: number | null;         // m/s (converted from knots)
  heading: number | null;          // degrees 0..360
  vertical_rate: number | null;    // m/s (converted from ft/min)
  on_ground: boolean;
  last_seen: string;               // ISO timestamp of the actual signal
}

const FT_TO_M = 0.3048;
const KT_TO_MPS = 0.5144444;

// Anchor circles overlap, so the same aircraft can arrive from several
// responses; keep the entry with the freshest signal.
export function toFlightRows(entries: TimedAircraft[]): FlightRow[] {
  const byIcao = new Map<string, FlightRow>();

  for (const { ac, nowMs } of entries) {
    if (!ac.hex) continue;
    if (ac.lat == null || ac.lon == null) continue;
    if ((ac.seen ?? 0) > MAX_STATE_AGE_SECONDS) continue;

    const icao24 = ac.hex.toLowerCase();
    const onGround = ac.alt_baro === "ground";
    const baroFt = typeof ac.alt_baro === "number" ? ac.alt_baro : null;
    const lastSeenMs = nowMs - (ac.seen ?? 0) * 1000;

    const prev = byIcao.get(icao24);
    if (prev && Date.parse(prev.last_seen) >= lastSeenMs) continue;

    byIcao.set(icao24, {
      icao24,
      callsign: ac.flight ? ac.flight.trim() || null : null,
      origin_country: countryForIcao(icao24),
      longitude: ac.lon,
      latitude: ac.lat,
      baro_altitude: baroFt != null ? baroFt * FT_TO_M : null,
      velocity: ac.gs != null ? ac.gs * KT_TO_MPS : null,
      heading: ac.track ?? null,
      vertical_rate: ac.baro_rate != null ? (ac.baro_rate * FT_TO_M) / 60 : null,
      on_ground: onGround,
      last_seen: new Date(lastSeenMs).toISOString(),
    });
  }

  return [...byIcao.values()];
}
