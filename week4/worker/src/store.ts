import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FlightRow } from "./transform.js";
import {
  ALT_EPSILON,
  CACHE_EVICT_MS,
  FORCE_REFRESH_MS,
  HEADING_EPSILON,
  LAT_LON_EPSILON,
  VELOCITY_EPSILON,
} from "./config.js";

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

// In-process cache of what we last wrote for each aircraft, plus the
// wall-clock time we wrote it. The time lets us force a refresh even for
// stationary aircraft so `prune-stale-current` (pg_cron TTL against
// last_seen) doesn't delete a parked plane whose position never changes.
interface CacheEntry {
  row: FlightRow;
  upsertedAtMs: number;
}
const lastWritten = new Map<string, CacheEntry>();

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

// Upserts rows whose state materially changed (plus periodic forced
// refreshes) and returns exactly the rows written, so the caller can mirror
// them into the observations history without re-diffing.
export async function upsertCurrent(
  supabase: SupabaseClient,
  rows: FlightRow[],
): Promise<{ written: FlightRow[]; skipped: number }> {
  if (rows.length === 0) return { written: [], skipped: 0 };

  const toWrite: FlightRow[] = [];
  const now = Date.now();
  let skipped = 0;
  for (const row of rows) {
    const prev = lastWritten.get(row.icao24);
    // Stale check keyed to the stored signal time — see FORCE_REFRESH_MS.
    const stale = prev && now - Date.parse(prev.row.last_seen) > FORCE_REFRESH_MS;
    if (prev && !stale && !materiallyChanged(prev.row, row)) {
      skipped += 1;
      continue;
    }
    toWrite.push(row);
  }

  if (toWrite.length === 0) return { written: [], skipped };

  const updatedAt = new Date().toISOString();
  const stamped = toWrite.map((r) => ({ ...r, updated_at: updatedAt }));

  for (let i = 0; i < stamped.length; i += CHUNK) {
    const slice = stamped.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("flights_current")
      .upsert(slice, { onConflict: "icao24" });
    if (error) throw new Error(`upsert flights_current: ${error.message}`);
  }

  // Update cache only after a successful write — if the upsert throws, we
  // retry everything on the next tick rather than desyncing our cache.
  for (const row of toWrite) {
    lastWritten.set(row.icao24, { row, upsertedAtMs: now });
  }

  return { written: toWrite, skipped };
}

// Drop cache entries that haven't been rewritten in CACHE_EVICT_MS — a
// reappearing aircraft force-refreshes anyway, so stale entries are pure
// memory leak over a long-running daemon. Called from the prune loop.
export function evictStaleCache(): number {
  const cutoff = Date.now() - CACHE_EVICT_MS;
  let evicted = 0;
  for (const [icao, entry] of lastWritten) {
    if (entry.upsertedAtMs < cutoff) {
      lastWritten.delete(icao);
      evicted += 1;
    }
  }
  return evicted;
}

// History keeps only rows whose state changed (what upsertCurrent wrote).
// Unchanged aircraft add no chart information, and skipping them keeps the
// observations table an order of magnitude smaller.
// `observed_at` is the actual signal time, not the DB write time, so the
// altitude/speed charts have an honest x-axis.
export async function insertObservations(
  supabase: SupabaseClient,
  written: FlightRow[],
): Promise<void> {
  if (written.length === 0) return;
  const payload = written.map(({ last_seen, ...rest }) => ({
    ...rest,
    observed_at: last_seen,
  }));
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK);
    const { error } = await supabase.from("observations").insert(slice);
    if (error) throw new Error(`insert observations: ${error.message}`);
  }
}
