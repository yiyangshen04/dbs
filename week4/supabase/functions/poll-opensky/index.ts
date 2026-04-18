// Supabase Edge Function (Deno runtime).
// Triggered by pg_cron every minute. Pulls aircraft positions from
// adsb.lol (community ADS-B feed) and upserts them into Supabase.
//
// History: originally used OpenSky Network, but OpenSky blocks TCP
// connections from major cloud provider IP ranges (confirmed against
// Railway + Supabase Edge — same ConnectTimeoutError in both). adsb.lol
// is a community-run feed that doesn't block cloud egress.
//
// adsb.lol exposes /v2/point/{lat}/{lon}/{radius_nm} with a 250 nm max
// radius, so we fan out across a grid of anchor points to cover the
// continental US and dedupe by ICAO hex.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Anchor points (lat, lon) each with a 250 nm radius — chosen to cover
// the continental US commercial air traffic corridors with overlap.
const ANCHORS: Array<[number, number]> = [
  [40.7, -74.0], // NYC / East coast
  [33.7, -84.4], // Atlanta / Southeast
  [25.8, -80.3], // Miami / South FL
  [41.9, -87.6], // Chicago / Midwest
  [32.9, -97.0], // DFW / South Central
  [39.7, -104.9], // Denver / Rockies
  [34.0, -118.2], // LA / SoCal
  [47.4, -122.3], // Seattle / Pacific NW
];
const RADIUS_NM = 250;

const MAX_STATE_AGE_SECONDS = 5 * 60;
const CHUNK = 1000;

const FT_TO_M = 0.3048;
const KT_TO_MPS = 0.5144444;

// adsb.lol single-aircraft shape (only the fields we use).
interface AdsbAircraft {
  hex: string;
  flight?: string;
  r?: string; // registration
  t?: string; // aircraft type
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  baro_rate?: number;
  seen?: number; // seconds since last seen, at server time
  seen_pos?: number;
}

interface AdsbResponse {
  now: number; // server wall clock, ms
  ac: AdsbAircraft[];
}

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

async function fetchAnchor(
  lat: number,
  lon: number,
): Promise<AdsbResponse> {
  const url = `https://api.adsb.lol/v2/point/${lat}/${lon}/${RADIUS_NM}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "mpcs-flight-tracker/0.1" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`adsb.lol ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as AdsbResponse;
}

function transform(
  aircraft: AdsbAircraft[],
  nowMs: number,
): FlightRow[] {
  const rows: FlightRow[] = [];
  for (const a of aircraft) {
    if (!a.hex) continue;
    if (a.lat == null || a.lon == null) continue;

    // `seen` is seconds since last signal. Drop stale entries.
    if ((a.seen ?? 0) > MAX_STATE_AGE_SECONDS) continue;

    const onGround = a.alt_baro === "ground";
    const baroFt =
      typeof a.alt_baro === "number" ? a.alt_baro : null;
    const lastSeenMs = nowMs - (a.seen ?? 0) * 1000;

    rows.push({
      icao24: a.hex.toLowerCase(),
      callsign: a.flight ? a.flight.trim() || null : null,
      origin_country: null, // adsb.lol doesn't provide country; live with null
      longitude: a.lon,
      latitude: a.lat,
      baro_altitude: baroFt != null ? baroFt * FT_TO_M : null,
      velocity: a.gs != null ? a.gs * KT_TO_MPS : null,
      heading: a.track ?? null,
      vertical_rate: a.baro_rate != null ? (a.baro_rate * FT_TO_M) / 60 : null, // ft/min → m/s
      on_ground: onGround,
      last_seen: new Date(lastSeenMs).toISOString(),
    });
  }
  return rows;
}

Deno.serve(async () => {
  const started = Date.now();
  try {
    // Fan out across anchor points in parallel.
    const responses = await Promise.all(
      ANCHORS.map(([lat, lon]) => fetchAnchor(lat, lon)),
    );

    // Merge and dedupe by ICAO hex. Overlap between anchors is expected.
    const byHex = new Map<string, FlightRow>();
    let rawCount = 0;
    for (const r of responses) {
      rawCount += r.ac?.length ?? 0;
      for (const row of transform(r.ac ?? [], r.now)) {
        byHex.set(row.icao24, row);
      }
    }
    const rows = [...byHex.values()];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const updatedAt = new Date().toISOString();
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const stamped = slice.map((r) => ({ ...r, updated_at: updatedAt }));
      const { error } = await supabase
        .from("flights_current")
        .upsert(stamped, { onConflict: "icao24" });
      if (error) throw new Error(`upsert flights_current: ${error.message}`);
    }

    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows
        .slice(i, i + CHUNK)
        .map(({ last_seen: _ls, ...rest }) => rest);
      const { error } = await supabase.from("observations").insert(slice);
      if (error) throw new Error(`insert observations: ${error.message}`);
    }

    const ms = Date.now() - started;
    console.log(
      `[poll] wrote ${rows.length} flights in ${ms} ms ` +
        `(raw: ${rawCount}, anchors: ${ANCHORS.length})`,
    );
    return Response.json({
      ok: true,
      flights: rows.length,
      raw: rawCount,
      anchors: ANCHORS.length,
      ms,
    });
  } catch (err) {
    const e = err as Error & { cause?: unknown };
    const causeMsg =
      e.cause instanceof Error ? `${e.cause.name}: ${e.cause.message}` : String(e.cause ?? "");
    console.error(
      `[poll] failure: ${e.message}${causeMsg ? ` (cause: ${causeMsg})` : ""}`,
    );
    return Response.json(
      { ok: false, error: e.message, cause: causeMsg || undefined },
      { status: 500 },
    );
  }
});
