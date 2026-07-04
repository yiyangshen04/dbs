// Multi-source ADS-B ingest. Three community aggregators expose the same
// readsb-derived /point API; each rate-limits per IP on roughly a
// per-minute budget, so a 30-anchor sweep from a single source gets 429s.
// We fetch anchors strictly serially and rotate sources per anchor, so no
// source sees more than ~1 request every 3.5 s. A failed anchor is retried
// once against the next source; anchors that fail both attempts are
// dropped for this sweep (partial data beats no data).
//
// This file replaced opensky.ts — the original OpenSky Network integration
// died when OpenSky blocked cloud-IP ranges; see CLAUDE.md for the pivot.

import {
  ANCHORS,
  ANCHOR_SPACING_MS,
  RADIUS_NM,
  RETRY_DELAY_MS,
} from "./config.js";

// One aircraft as returned by any of the sources (readsb JSON shape).
// We only type the fields we consume.
export interface AdsbAircraft {
  hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  baro_rate?: number;
  seen?: number; // seconds since last signal, relative to `now`
  seen_pos?: number;
}

// An aircraft paired with the server clock of the response it came from,
// so `seen` can be converted to an absolute timestamp per anchor.
export interface TimedAircraft {
  ac: AdsbAircraft;
  nowMs: number;
}

export interface SweepResult {
  entries: TimedAircraft[];
  rawCount: number;
  anchorsOk: number;
  anchorsFailed: number;
}

interface Source {
  name: string;
  url: (lat: number, lon: number) => string;
}

const SOURCES: Source[] = [
  {
    name: "adsb.lol",
    url: (la, lo) => `https://api.adsb.lol/v2/point/${la}/${lo}/${RADIUS_NM}`,
  },
  {
    name: "airplanes.live",
    url: (la, lo) => `https://api.airplanes.live/v2/point/${la}/${lo}/${RADIUS_NM}`,
  },
  {
    name: "adsb.fi",
    url: (la, lo) => `https://opendata.adsb.fi/api/v2/lat/${la}/lon/${lo}/dist/${RADIUS_NM}`,
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchAnchor(
  src: Source,
  lat: number,
  lon: number,
): Promise<{ list: AdsbAircraft[]; nowMs: number }> {
  const res = await fetch(src.url(lat, lon), {
    headers: { "User-Agent": "mpcs-flight-tracker-worker/0.2" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${src.name} ${res.status}: ${body.slice(0, 120)}`);
  }
  const j = (await res.json()) as {
    now: number;
    ac?: AdsbAircraft[];       // adsb.lol, airplanes.live
    aircraft?: AdsbAircraft[]; // adsb.fi
  };
  // adsb.fi reports `now` in seconds; the others in milliseconds.
  const nowMs = j.now > 1e12 ? j.now : j.now * 1000;
  return { list: j.ac ?? j.aircraft ?? [], nowMs };
}

export async function sweepAnchors(): Promise<SweepResult> {
  const entries: TimedAircraft[] = [];
  let rawCount = 0;
  let anchorsOk = 0;
  let anchorsFailed = 0;

  for (let i = 0; i < ANCHORS.length; i++) {
    const [lat, lon] = ANCHORS[i]!;
    let result: { list: AdsbAircraft[]; nowMs: number } | null = null;

    for (let attempt = 0; attempt < 2 && !result; attempt++) {
      const src = SOURCES[(i + attempt) % SOURCES.length]!;
      try {
        result = await fetchAnchor(src, lat, lon);
      } catch (err) {
        if (attempt === 0) {
          await sleep(RETRY_DELAY_MS);
        } else {
          anchorsFailed += 1;
          console.warn(
            `[sweep] anchor ${lat},${lon} failed on both sources: ${(err as Error).message}`,
          );
        }
      }
    }

    if (result) {
      anchorsOk += 1;
      rawCount += result.list.length;
      for (const ac of result.list) {
        if (ac.hex) entries.push({ ac, nowMs: result.nowMs });
      }
    }
    if (i < ANCHORS.length - 1) await sleep(ANCHOR_SPACING_MS);
  }

  if (anchorsOk === 0) {
    throw new Error(`all ${ANCHORS.length} anchors failed`);
  }
  return { entries, rawCount, anchorsOk, anchorsFailed };
}
