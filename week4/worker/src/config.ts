// adsb.lol /v2/point caps the radius at 250 nm, so we fan out across a
// grid of anchor points covering the continental US commercial corridors.
// Matches the Edge Function's coverage exactly.
export const ANCHORS: Array<[number, number]> = [
  [40.7, -74.0],   // NYC / East coast
  [33.7, -84.4],   // Atlanta / Southeast
  [25.8, -80.3],   // Miami / South FL
  [41.9, -87.6],   // Chicago / Midwest
  [32.9, -97.0],   // DFW / South Central
  [39.7, -104.9],  // Denver / Rockies
  [34.0, -118.2],  // LA / SoCal
  [47.4, -122.3],  // Seattle / Pacific NW
];
export const RADIUS_NM = 250;

export const POLL_INTERVAL_MS = 15_000;

// Drop state vectors older than this — adsb.lol's `seen` is seconds since
// last signal, so anything > 5 min is a ghost.
export const MAX_STATE_AGE_SECONDS = 5 * 60;

// Back-off when adsb.lol returns 429 or 5xx, or the network flakes.
export const BACKOFF_MS = [15_000, 30_000, 60_000] as const;

// Worker-side fallback pruning cadence (only used if pg_cron is unavailable).
// Safe to leave enabled alongside pg_cron — double-deletes are no-ops.
export const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
export const OBSERVATION_TTL_HOURS = 6;
