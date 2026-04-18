import type { RawState } from "./opensky.js";
import { MAX_STATE_AGE_SECONDS } from "./config.js";

export interface FlightRow {
  icao24: string;
  callsign: string | null;
  origin_country: string | null;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  velocity: number | null;
  heading: number | null;
  vertical_rate: number | null;
  on_ground: boolean;
  last_seen: string;
}

export function transformStates(
  states: RawState[] | null,
  now: number = Math.floor(Date.now() / 1000),
): FlightRow[] {
  if (!states) return [];
  const rows: FlightRow[] = [];

  for (const s of states) {
    const icao24 = s[0];
    const longitude = s[5];
    const latitude = s[6];
    const timePosition = s[3];
    const lastContact = s[4];

    if (!icao24) continue;
    if (longitude === null || latitude === null) continue;

    // Staleness guard. If we haven't heard from this aircraft recently,
    // don't treat it as "current".
    const freshest = Math.max(timePosition ?? 0, lastContact ?? 0);
    if (freshest && now - freshest > MAX_STATE_AGE_SECONDS) continue;

    const callsignRaw = s[1];
    const callsign = callsignRaw ? callsignRaw.trim() || null : null;
    const lastSeenEpoch = freshest || now;

    rows.push({
      icao24: icao24.toLowerCase(),
      callsign,
      origin_country: s[2] || null,
      longitude,
      latitude,
      baro_altitude: s[7],
      velocity: s[9],
      heading: s[10],
      vertical_rate: s[11],
      on_ground: Boolean(s[8]),
      last_seen: new Date(lastSeenEpoch * 1000).toISOString(),
    });
  }

  return rows;
}
