import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FlightRow } from "./transform.js";

export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Supabase REST has a payload cap; batch in chunks.
const CHUNK = 1000;

// Position diff thresholds. Planes in cruise shift their reported position
// every poll; we still want to broadcast those, but we skip micro-changes
// and truly stationary aircraft. The thresholds are tight enough that the
// UI still moves smoothly for visibly-airborne traffic.
const LAT_LON_EPSILON = 0.001;   // ~100 m
const VELOCITY_EPSILON = 1.0;    // m/s
const ALT_EPSILON = 10;          // m
const HEADING_EPSILON = 2;       // degrees

// In-process cache of what we last wrote for each aircraft, so we can skip
// upserts (and the Realtime broadcast they cause) when nothing meaningful
// changed. Cleared on process restart — that's fine, the next poll just
// rewrites everything once.
const lastSeen = new Map<string, FlightRow>();

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

export async function upsertCurrent(
  supabase: SupabaseClient,
  rows: FlightRow[],
): Promise<{ upserted: number; skipped: number }> {
  if (rows.length === 0) return { upserted: 0, skipped: 0 };

  const toWrite: FlightRow[] = [];
  let skipped = 0;
  for (const row of rows) {
    const prev = lastSeen.get(row.icao24);
    if (prev && !materiallyChanged(prev, row)) {
      skipped += 1;
      continue;
    }
    toWrite.push(row);
  }

  if (toWrite.length === 0) return { upserted: 0, skipped };

  const stamped = toWrite.map((r) => ({
    ...r,
    updated_at: new Date().toISOString(),
  }));

  for (let i = 0; i < stamped.length; i += CHUNK) {
    const slice = stamped.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("flights_current")
      .upsert(slice, { onConflict: "icao24" });
    if (error) throw new Error(`upsert flights_current: ${error.message}`);
  }

  // Update cache only after a successful write — if the upsert throws, we
  // retry everything on the next tick rather than desyncing our cache.
  for (const row of toWrite) lastSeen.set(row.icao24, row);

  return { upserted: toWrite.length, skipped };
}

export async function insertObservations(
  supabase: SupabaseClient,
  rows: FlightRow[],
): Promise<void> {
  if (rows.length === 0) return;
  // observations is the full append-only history — every row goes in
  // regardless of whether its position "changed" since the last poll.
  const payload = rows.map(({ last_seen: _last, ...rest }) => rest);
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK);
    const { error } = await supabase.from("observations").insert(slice);
    if (error) throw new Error(`insert observations: ${error.message}`);
  }
}
