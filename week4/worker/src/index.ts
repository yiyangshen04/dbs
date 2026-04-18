import "dotenv/config";
import { fetchStates } from "./opensky.js";
import { transformStates } from "./transform.js";
import {
  createServiceClient,
  insertObservations,
  upsertCurrent,
} from "./store.js";
import { pruneObservations, pruneStaleCurrent } from "./prune.js";
import {
  BACKOFF_MS,
  POLL_INTERVAL_MS,
  PRUNE_INTERVAL_MS,
} from "./config.js";

const supabase = createServiceClient();

let consecutiveFailures = 0;
let stopping = false;
let pollTimer: NodeJS.Timeout | null = null;
let pruneTimer: NodeJS.Timeout | null = null;

async function tick(): Promise<void> {
  const started = Date.now();
  try {
    const { states } = await fetchStates();
    const rows = transformStates(states);

    await Promise.all([
      upsertCurrent(supabase, rows),
      insertObservations(supabase, rows),
    ]);

    const ms = Date.now() - started;
    console.log(
      `[poll] wrote ${rows.length} flights in ${ms} ms ` +
        `(raw states: ${states?.length ?? 0})`,
    );
    consecutiveFailures = 0;
  } catch (err) {
    consecutiveFailures += 1;
    const backoff =
      BACKOFF_MS[Math.min(consecutiveFailures - 1, BACKOFF_MS.length - 1)] ??
      BACKOFF_MS[BACKOFF_MS.length - 1] ??
      POLL_INTERVAL_MS;
    console.error(
      `[poll] failure #${consecutiveFailures}: ${(err as Error).message}. ` +
        `Backing off ${backoff} ms.`,
    );
    // Sleep before the next scheduled tick fires.
    if (!stopping) await new Promise((r) => setTimeout(r, backoff));
  } finally {
    if (!stopping) pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
  }
}

async function pruneTick(): Promise<void> {
  try {
    const obs = await pruneObservations(supabase);
    const stale = await pruneStaleCurrent(supabase);
    if (obs || stale) {
      console.log(
        `[prune] removed ${obs} observations, ${stale} stale current rows`,
      );
    }
  } catch (err) {
    console.error(`[prune] ${(err as Error).message}`);
  } finally {
    if (!stopping) pruneTimer = setTimeout(pruneTick, PRUNE_INTERVAL_MS);
  }
}

function shutdown(signal: string): void {
  if (stopping) return;
  stopping = true;
  console.log(`\n[worker] received ${signal}, shutting down`);
  if (pollTimer) clearTimeout(pollTimer);
  if (pruneTimer) clearTimeout(pruneTimer);
  // Give in-flight requests a moment to finish.
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.log(
  `[worker] starting — polling every ${POLL_INTERVAL_MS} ms, ` +
    `pruning every ${PRUNE_INTERVAL_MS} ms`,
);
void tick();
void pruneTick();
