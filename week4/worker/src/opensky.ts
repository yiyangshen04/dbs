// Historical name — this module originally spoke to OpenSky Network.
// It now fetches from adsb.lol; the file is kept at the same path to
// avoid churn in index.ts / store.ts imports. See CLAUDE.md for the
// pivot rationale.

import { ANCHORS, RADIUS_NM } from "./config.js";

// Shape of one aircraft as returned by adsb.lol /v2/point.
// We only type the fields we actually consume.
export interface AdsbAircraft {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  baro_rate?: number;
  seen?: number;       // seconds since last signal
  seen_pos?: number;
}

interface AdsbAnchorResponse {
  now: number;   // server wall clock, ms
  ac: AdsbAircraft[];
}

export interface StatesResult {
  aircraft: AdsbAircraft[];
  serverNowMs: number;
  rawCount: number;
}

async function fetchAnchor(
  lat: number,
  lon: number,
): Promise<AdsbAnchorResponse> {
  const url = `https://api.adsb.lol/v2/point/${lat}/${lon}/${RADIUS_NM}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "mpcs-flight-tracker-worker/0.1" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`adsb.lol ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as AdsbAnchorResponse;
}

// Fan out across all anchors in parallel, dedupe by ICAO hex.
export async function fetchStates(): Promise<StatesResult> {
  const responses = await Promise.all(
    ANCHORS.map(([lat, lon]) => fetchAnchor(lat, lon)),
  );

  const byHex = new Map<string, AdsbAircraft>();
  let rawCount = 0;
  let serverNowMs = Date.now();
  for (const r of responses) {
    rawCount += r.ac?.length ?? 0;
    serverNowMs = r.now; // all anchors hit the same backend; any `now` works
    for (const a of r.ac ?? []) {
      if (a.hex) byHex.set(a.hex, a);
    }
  }
  return {
    aircraft: [...byHex.values()],
    serverNowMs,
    rawCount,
  };
}
