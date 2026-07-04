import "dotenv/config";
import { sweepAnchors } from "./sources.js";
import { toFlightRows } from "./transform.js";
import {
  createServiceClient,
  evictStaleCache,
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
  let extraDelay = 0;
  try {
    const { entries, rawCount, anchorsOk, anchorsFailed } =
      await sweepAnchors();
    const rows = toFlightRows(entries);

    // Upsert first, then mirror the written rows into history. If the
    // history insert fails we lose one best-effort sample, not live state.
    const { written, skipped } = await upsertCurrent(supabase, rows);
    await insertObservations(supabase, written);

    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `[poll] upserted ${written.length}, skipped ${skipped} unchanged ` +
        `(raw ${rawCount}, unique ${rows.length}, ` +
        `anchors ${anchorsOk} ok / ${anchorsFailed} failed) in ${secs} s`,
    );
    consecutiveFailures = 0;
  } catch (err) {
    consecutiveFailures += 1;
    extraDelay =
      BACKOFF_MS[Math.min(consecutiveFailures - 1, BACKOFF_MS.length - 1)] ??
      BACKOFF_MS[BACKOFF_MS.length - 1] ??
      POLL_INTERVAL_MS;
    const e = err as Error & { cause?: unknown };
    const causeMsg =
      e.cause instanceof Error ? `${e.cause.name}: ${e.cause.message}` : String(e.cause ?? "");
    console.error(
      `[poll] failure #${consecutiveFailures}: ${e.message}` +
        (causeMsg ? ` (cause: ${causeMsg})` : "") +
        `. Adding ${extraDelay} ms back-off.`,
    );
  } finally {
    if (!stopping) {
      // Fixed cadence measured from sweep start (a sweep takes ~40 s of
      // the 60 s interval), never sooner than 5 s from now.
      const elapsed = Date.now() - started;
      const delay = Math.max(5_000, POLL_INTERVAL_MS - elapsed) + extraDelay;
      pollTimer = setTimeout(tick, delay);
    }
  }
}

async function pruneTick(): Promise<void> {
  try {
    const obs = await pruneObservations(supabase);
    const stale = await pruneStaleCurrent(supabase);
    const evicted = evictStaleCache();
    if (obs || stale || evicted) {
      console.log(
        `[prune] removed ${obs} observations, ${stale} stale current rows, ` +
          `evicted ${evicted} cache entries`,
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
  `[worker] starting — sweeping every ${POLL_INTERVAL_MS} ms, ` +
    `pruning every ${PRUNE_INTERVAL_MS} ms`,
);
void tick();
void pruneTick();
