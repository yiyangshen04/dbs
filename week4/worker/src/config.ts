export const BBOX = {
  lamin: 24,
  lomin: -125,
  lamax: 49,
  lomax: -66,
} as const;

export const POLL_INTERVAL_MS = 12_000;

// Maximum age of a state vector we'll accept (OpenSky sometimes returns stale
// entries; treating them as "current" would produce ghosts on the map).
export const MAX_STATE_AGE_SECONDS = 5 * 60;

// Back-off when OpenSky returns 429 or 5xx.
export const BACKOFF_MS = [15_000, 30_000, 60_000] as const;

// Worker-side fallback pruning cadence (only used if pg_cron is unavailable).
// Safe to leave enabled alongside pg_cron — double-deletes are no-ops.
export const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
export const OBSERVATION_TTL_HOURS = 6;
