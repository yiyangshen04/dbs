// Supabase Edge Function (Deno runtime) — primary ingest path.
// Triggered by pg_cron every minute. Sweeps a 30-anchor grid covering the
// whole US (CONUS + Alaska + Hawaii) across three community ADS-B
// aggregators and writes the results into Supabase.
//
// Design notes:
// - The aggregators rate-limit per IP on a per-minute budget, so anchors
//   are fetched strictly serially (~1.2 s apart) and rotated across three
//   mirror sources; a failed anchor retries once on the next source and is
//   otherwise dropped for this sweep. A full sweep takes ~40 s.
// - pg_net's HTTP timeout is a few seconds, so the handler responds 202
//   immediately and runs the sweep in the background via
//   EdgeRuntime.waitUntil. Call with ?sync=1 to wait and get sweep stats
//   (useful for manual testing).
// - The worker keeps an in-memory diff cache; this function is stateless,
//   so it reads flights_current once per sweep and skips rows that didn't
//   materially change (forced through every 5 min so the stale-row TTL
//   never deletes a parked-but-alive aircraft).
// - History: originally OpenSky Network (blocked cloud IPs → pivoted to
//   adsb.lol; then adsb.lol added per-minute rate limits → multi-source
//   rotation). The function name is kept to avoid re-wiring pg_cron.
//
// NOTE: keep ANCHORS / ICAO_RANGES / thresholds in sync with worker/src.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------- anchors

const ANCHORS: Array<[number, number]> = [
  // southern rim + Gulf corridor
  [26.3, -81.0], [26.3, -98.0], [28.2, -90.5],
  // lat 32 row
  [32.0, -81.5], [32.0, -89.75], [32.0, -98.0], [32.0, -106.25], [32.0, -114.5],
  // lat 37.7 row
  [37.7, -76.5], [37.7, -85.3], [37.7, -94.2], [37.7, -103.0], [37.7, -111.9], [37.7, -120.7],
  // lat 43.4 row + NW California coast
  [43.4, -71.5], [43.4, -81.1], [43.4, -90.7], [43.4, -100.3], [43.4, -109.9], [43.4, -119.5], [41.0, -123.5],
  // northern rim + Maine
  [47.0, -68.5], [48.0, -89.0], [48.0, -99.5], [48.0, -110.0], [48.0, -120.5],
  // Alaska + Hawaii
  [61.2, -149.9], [64.8, -147.7], [58.4, -134.6], [21.3, -157.9],
];
const RADIUS_NM = 250;
const ANCHOR_SPACING_MS = 1_150;
const RETRY_DELAY_MS = 2_500;
const MAX_STATE_AGE_SECONDS = 5 * 60;
// Rewrite an unchanged aircraft once its stored last_seen (signal time!)
// is this old. Keyed to last_seen — not write time — because last_seen can
// already lag by up to MAX_STATE_AGE_SECONDS at write time, and the
// 10-minute stale TTL prunes on last_seen. 4 min + one sweep period keeps
// live-but-parked aircraft comfortably inside the TTL.
const FORCE_REFRESH_MS = 4 * 60 * 1000;
const CHUNK = 1000;
// The 1-minute cron fires regardless of sweep duration; the DB-side lock
// (public.ingest_lock, migration 0003) keeps sweeps from overlapping and
// hammering the rate-limited aggregators. TTL bounds a crashed run.
const LOCK_TTL_MS = 3 * 60 * 1000;

const LAT_LON_EPSILON = 0.001; // ~100 m
const VELOCITY_EPSILON = 1.0;  // m/s
const ALT_EPSILON = 10;        // m
const HEADING_EPSILON = 2;     // degrees

const FT_TO_M = 0.3048;
const KT_TO_MPS = 0.5144444;

// ---------------------------------------------------------------- sources

interface AdsbAircraft {
  hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  baro_rate?: number;
  seen?: number;
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
    headers: { "User-Agent": "mpcs-flight-tracker/0.2" },
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

// ---------------------------------------------------------- icao → country

const ICAO_RANGES: Array<[number, number, string]> = [
  [0x0d0000, 0x0d7fff, "Mexico"],
  [0x100000, 0x1fffff, "Russia"],
  [0x300000, 0x33ffff, "Italy"],
  [0x340000, 0x37ffff, "Spain"],
  [0x380000, 0x3bffff, "France"],
  [0x3c0000, 0x3fffff, "Germany"],
  [0x400000, 0x43ffff, "United Kingdom"],
  [0x440000, 0x447fff, "Austria"],
  [0x448000, 0x44ffff, "Belgium"],
  [0x458000, 0x45ffff, "Denmark"],
  [0x460000, 0x467fff, "Finland"],
  [0x468000, 0x46ffff, "Greece"],
  [0x470000, 0x477fff, "Hungary"],
  [0x478000, 0x47ffff, "Norway"],
  [0x480000, 0x487fff, "Netherlands"],
  [0x488000, 0x48ffff, "Poland"],
  [0x490000, 0x497fff, "Portugal"],
  [0x498000, 0x49ffff, "Czechia"],
  [0x4a0000, 0x4a7fff, "Romania"],
  [0x4a8000, 0x4affff, "Sweden"],
  [0x4b0000, 0x4b7fff, "Switzerland"],
  [0x4b8000, 0x4bffff, "Turkey"],
  [0x4ca000, 0x4cafff, "Ireland"],
  [0x4cc000, 0x4ccfff, "Iceland"],
  [0x710000, 0x717fff, "Saudi Arabia"],
  [0x718000, 0x71ffff, "South Korea"],
  [0x738000, 0x73ffff, "Israel"],
  [0x780000, 0x7bffff, "China"],
  [0x7c0000, 0x7fffff, "Australia"],
  [0x800000, 0x83ffff, "India"],
  [0x840000, 0x87ffff, "Japan"],
  [0xa00000, 0xafffff, "United States"],
  [0xc00000, 0xc3ffff, "Canada"],
  [0xc80000, 0xc87fff, "New Zealand"],
  [0xe00000, 0xe3ffff, "Argentina"],
  [0xe40000, 0xe7ffff, "Brazil"],
];

function countryForIcao(hex: string): string | null {
  const addr = Number.parseInt(hex, 16);
  if (Number.isNaN(addr)) return null;
  for (const [lo, hi, name] of ICAO_RANGES) {
    if (addr >= lo && addr <= hi) return name;
  }
  return null;
}

// ---------------------------------------------------------------- rows

interface FlightRow {
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

function toRow(ac: AdsbAircraft, nowMs: number): FlightRow | null {
  if (!ac.hex || ac.lat == null || ac.lon == null) return null;
  if ((ac.seen ?? 0) > MAX_STATE_AGE_SECONDS) return null;
  const icao24 = ac.hex.toLowerCase();
  const baroFt = typeof ac.alt_baro === "number" ? ac.alt_baro : null;
  return {
    icao24,
    callsign: ac.flight ? ac.flight.trim() || null : null,
    origin_country: countryForIcao(icao24),
    longitude: ac.lon,
    latitude: ac.lat,
    baro_altitude: baroFt != null ? baroFt * FT_TO_M : null,
    velocity: ac.gs != null ? ac.gs * KT_TO_MPS : null,
    heading: ac.track ?? null,
    vertical_rate: ac.baro_rate != null ? (ac.baro_rate * FT_TO_M) / 60 : null,
    on_ground: ac.alt_baro === "ground",
    last_seen: new Date(nowMs - (ac.seen ?? 0) * 1000).toISOString(),
  };
}

function materiallyChanged(prev: FlightRow, next: FlightRow): boolean {
  if (prev.on_ground !== next.on_ground) return true;
  if (prev.callsign !== next.callsign) return true;
  if (diff(prev.latitude, next.latitude) > LAT_LON_EPSILON) return true;
  if (diff(prev.longitude, next.longitude) > LAT_LON_EPSILON) return true;
  if (diff(prev.velocity, next.velocity) > VELOCITY_EPSILON) return true;
  if (diff(prev.baro_altitude, next.baro_altitude) > ALT_EPSILON) return true;
  if (diff(prev.heading, next.heading) > HEADING_EPSILON) return true;
  return false;
}

function diff(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null || b == null) return Infinity;
  return Math.abs(a - b);
}

// ---------------------------------------------------------------- sweep

interface SweepStats {
  ok: boolean;
  skipped_run?: boolean;
  unique?: number;
  written?: number;
  skipped?: number;
  raw?: number;
  anchorsOk?: number;
  anchorsFailed?: number;
  ms: number;
}

// Atomically claim the ingest lock: succeeds only if the previous holder's
// TTL expired or the lock was released. One UPDATE, so two concurrent
// invocations can't both win.
async function claimLock(
  supabase: ReturnType<typeof createClient>,
): Promise<boolean> {
  const now = Date.now();
  const { data, error } = await supabase
    .from("ingest_lock")
    .update({ locked_until: new Date(now + LOCK_TTL_MS).toISOString() })
    .eq("id", 1)
    .lt("locked_until", new Date(now).toISOString())
    .select("id");
  if (error) {
    throw new Error(
      `claim ingest_lock: ${error.message} (did migration 0003 run?)`,
    );
  }
  return (data?.length ?? 0) > 0;
}

async function releaseLock(
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const { error } = await supabase
    .from("ingest_lock")
    .update({ locked_until: new Date().toISOString() })
    .eq("id", 1);
  if (error) console.warn(`[lock] release failed: ${error.message}`);
}

async function runSweep(): Promise<SweepStats> {
  const started = Date.now();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // 0) Skip if the previous sweep is still running — overlapping sweeps
  // would double the request rate against per-minute rate limits.
  if (!(await claimLock(supabase))) {
    console.log("[poll] previous sweep still running, skipping this tick");
    return { ok: true, skipped_run: true, ms: Date.now() - started };
  }

  try {
    // 1) Serial multi-source sweep.
    const byIcao = new Map<string, FlightRow>();
    let raw = 0;
    let anchorsOk = 0;
    let anchorsFailed = 0;

    for (let i = 0; i < ANCHORS.length; i++) {
      const [lat, lon] = ANCHORS[i];
      let result: { list: AdsbAircraft[]; nowMs: number } | null = null;
      for (let attempt = 0; attempt < 2 && !result; attempt++) {
        const src = SOURCES[(i + attempt) % SOURCES.length];
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
        raw += result.list.length;
        for (const ac of result.list) {
          const row = toRow(ac, result.nowMs);
          if (!row) continue;
          const prev = byIcao.get(row.icao24);
          // Overlapping anchors: keep the freshest signal.
          if (prev && Date.parse(prev.last_seen) >= Date.parse(row.last_seen)) continue;
          byIcao.set(row.icao24, row);
        }
      }
      if (i < ANCHORS.length - 1) await sleep(ANCHOR_SPACING_MS);
    }

    if (anchorsOk === 0) throw new Error(`all ${ANCHORS.length} anchors failed`);
    const rows = [...byIcao.values()];

    // 2) Stateless diff: read what's currently stored, skip unchanged rows.
    // Keyset pagination (icao24 > lastKey) — offset pages can skip rows
    // when the TTL prune deletes between requests.
    const current = new Map<string, FlightRow & { updated_at: string }>();
    let lastKey = "";
    for (let page = 0; page < 20; page++) {
      let q = supabase
        .from("flights_current")
        .select(
          "icao24, callsign, origin_country, longitude, latitude, baro_altitude, velocity, heading, vertical_rate, on_ground, last_seen, updated_at",
        )
        .order("icao24")
        .limit(CHUNK);
      if (lastKey) q = q.gt("icao24", lastKey);
      const { data, error } = await q;
      if (error) throw new Error(`read flights_current: ${error.message}`);
      for (const row of data ?? []) current.set(row.icao24, row);
      if ((data?.length ?? 0) < CHUNK) break;
      lastKey = data![data!.length - 1].icao24;
    }

    const nowMs = Date.now();
    const toWrite: FlightRow[] = [];
    let skipped = 0;
    for (const row of rows) {
      const prev = current.get(row.icao24);
      // Stale check keyed to the stored signal time — see FORCE_REFRESH_MS.
      const stale = prev && nowMs - Date.parse(prev.last_seen) > FORCE_REFRESH_MS;
      if (prev && !stale && !materiallyChanged(prev, row)) {
        skipped += 1;
        continue;
      }
      toWrite.push(row);
    }

    // 3) Upsert live state, then mirror written rows into history with the
    // actual signal time as observed_at.
    const updatedAt = new Date().toISOString();
    for (let i = 0; i < toWrite.length; i += CHUNK) {
      const slice = toWrite
        .slice(i, i + CHUNK)
        .map((r) => ({ ...r, updated_at: updatedAt }));
      const { error } = await supabase
        .from("flights_current")
        .upsert(slice, { onConflict: "icao24" });
      if (error) throw new Error(`upsert flights_current: ${error.message}`);
    }
    for (let i = 0; i < toWrite.length; i += CHUNK) {
      const slice = toWrite
        .slice(i, i + CHUNK)
        .map(({ last_seen, ...rest }) => ({ ...rest, observed_at: last_seen }));
      const { error } = await supabase.from("observations").insert(slice);
      if (error) throw new Error(`insert observations: ${error.message}`);
    }

    const stats: SweepStats = {
      ok: true,
      unique: rows.length,
      written: toWrite.length,
      skipped,
      raw,
      anchorsOk,
      anchorsFailed,
      ms: Date.now() - started,
    };
    console.log(
      `[poll] wrote ${stats.written}, skipped ${stats.skipped} unchanged ` +
        `(raw ${stats.raw}, unique ${stats.unique}, ` +
        `anchors ${stats.anchorsOk} ok / ${stats.anchorsFailed} failed) in ${stats.ms} ms`,
    );
    return stats;
  } finally {
    await releaseLock(supabase);
  }
}

// ---------------------------------------------------------------- handler

Deno.serve(async (req) => {
  const sync = new URL(req.url).searchParams.get("sync") === "1";

  if (sync) {
    try {
      return Response.json(await runSweep());
    } catch (err) {
      const e = err as Error;
      console.error(`[poll] failure: ${e.message}`);
      return Response.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  // pg_net times out after a few seconds — acknowledge immediately and run
  // the ~40 s sweep in the background.
  EdgeRuntime.waitUntil(
    runSweep().catch((err: Error) =>
      console.error(`[poll] background failure: ${err.message}`),
    ),
  );
  return Response.json({ ok: true, started: true }, { status: 202 });
});
