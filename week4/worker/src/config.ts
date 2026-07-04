// Full-US anchor grid for /v2/point queries (250 nm radius cap per request).
// Hexagonal lattice over the CONUS outline plus Alaska hubs and Hawaii,
// verified gap-free against a 0.25° sample grid (see week4/README.md).
// NOTE: keep in sync with supabase/functions/poll-opensky/index.ts.
export const ANCHORS: Array<[number, number]> = [
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
export const RADIUS_NM = 250;

// The community aggregators rate-limit per IP on a per-minute budget, so
// anchors are fetched strictly serially, rotated across three mirror
// sources, with this gap between consecutive requests.
export const ANCHOR_SPACING_MS = 1_150;
export const RETRY_DELAY_MS = 2_500;

// One full sweep takes ~40 s; start a new sweep every 60 s.
export const POLL_INTERVAL_MS = 60_000;

// Drop state vectors older than this — `seen` is seconds since last
// signal, so anything > 5 min is a ghost.
export const MAX_STATE_AGE_SECONDS = 5 * 60;

// Extra back-off after consecutive whole-sweep failures.
export const BACKOFF_MS = [30_000, 60_000, 120_000] as const;

// Worker-side fallback pruning cadence (only used if pg_cron is unavailable).
// Safe to leave enabled alongside pg_cron — double-deletes are no-ops.
export const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
export const OBSERVATION_TTL_HOURS = 3;
export const STALE_CURRENT_MINUTES = 10;

// Position diff thresholds for skipping unchanged rows. Tight enough that
// visibly-moving traffic always broadcasts.
export const LAT_LON_EPSILON = 0.001; // ~100 m
export const VELOCITY_EPSILON = 1.0;  // m/s
export const ALT_EPSILON = 10;        // m
export const HEADING_EPSILON = 2;     // degrees

// Rewrite an unchanged (parked) aircraft once its stored last_seen — the
// signal time, which can already lag MAX_STATE_AGE_SECONDS at write time —
// is this old. Keyed to last_seen because the stale-current TTL prunes on
// last_seen; 4 min plus one sweep period stays comfortably inside the
// 10-minute TTL even with back-off.
export const FORCE_REFRESH_MS = 4 * 60 * 1000;

// Evict diff-cache entries not rewritten for this long — they can never
// cause a skip again (any reappearance force-refreshes), so keeping them
// only leaks memory across the worker's lifetime.
export const CACHE_EVICT_MS = 30 * 60 * 1000;
