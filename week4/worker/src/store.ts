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

export async function upsertCurrent(
  supabase: SupabaseClient,
  rows: FlightRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const stamped = rows.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  for (let i = 0; i < stamped.length; i += CHUNK) {
    const slice = stamped.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("flights_current")
      .upsert(slice, { onConflict: "icao24" });
    if (error) throw new Error(`upsert flights_current: ${error.message}`);
  }
}

export async function insertObservations(
  supabase: SupabaseClient,
  rows: FlightRow[],
): Promise<void> {
  if (rows.length === 0) return;
  // observed_at defaults to now() server-side — we don't override it so all
  // rows in a batch share the same wall-clock stamp (easier to query).
  const payload = rows.map(({ last_seen: _last, ...rest }) => rest);
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK);
    const { error } = await supabase.from("observations").insert(slice);
    if (error) throw new Error(`insert observations: ${error.message}`);
  }
}
