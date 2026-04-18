import type { SupabaseClient } from "@supabase/supabase-js";
import { OBSERVATION_TTL_HOURS } from "./config.js";

// Fallback TTL sweep for tiers that don't support pg_cron.
// Safe to run alongside pg_cron — double-deletes are no-ops.
export async function pruneObservations(
  supabase: SupabaseClient,
): Promise<number> {
  const cutoff = new Date(
    Date.now() - OBSERVATION_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const { error, count } = await supabase
    .from("observations")
    .delete({ count: "exact" })
    .lt("observed_at", cutoff);
  if (error) throw new Error(`prune observations: ${error.message}`);
  return count ?? 0;
}

export async function pruneStaleCurrent(
  supabase: SupabaseClient,
): Promise<number> {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { error, count } = await supabase
    .from("flights_current")
    .delete({ count: "exact" })
    .lt("last_seen", cutoff);
  if (error) throw new Error(`prune flights_current: ${error.message}`);
  return count ?? 0;
}
