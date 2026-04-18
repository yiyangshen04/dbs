import type { AdsbAircraft } from "./opensky.js";
import { MAX_STATE_AGE_SECONDS } from "./config.js";

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
  last_seen: string;               // ISO timestamp
}

const FT_TO_M = 0.3048;
const KT_TO_MPS = 0.5144444;

export function transformStates(
  aircraft: AdsbAircraft[],
  serverNowMs: number,
): FlightRow[] {
  const rows: FlightRow[] = [];

  for (const a of aircraft) {
    if (!a.hex) continue;
    if (a.lat == null || a.lon == null) continue;

    // `seen` is seconds since last signal. Drop stale entries.
    if ((a.seen ?? 0) > MAX_STATE_AGE_SECONDS) continue;

    const onGround = a.alt_baro === "ground";
    const baroFt = typeof a.alt_baro === "number" ? a.alt_baro : null;
    const lastSeenMs = serverNowMs - (a.seen ?? 0) * 1000;

    rows.push({
      icao24: a.hex.toLowerCase(),
      callsign: a.flight ? a.flight.trim() || null : null,
      // adsb.lol doesn't provide origin country; leave null.
      origin_country: null,
      longitude: a.lon,
      latitude: a.lat,
      baro_altitude: baroFt != null ? baroFt * FT_TO_M : null,
      velocity: a.gs != null ? a.gs * KT_TO_MPS : null,
      heading: a.track ?? null,
      vertical_rate: a.baro_rate != null ? (a.baro_rate * FT_TO_M) / 60 : null,
      on_ground: onGround,
      last_seen: new Date(lastSeenMs).toISOString(),
    });
  }

  return rows;
}
