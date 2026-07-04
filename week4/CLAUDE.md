# US Airspace Monitor

A live map of aircraft over the **entire United States** (CONUS + Alaska +
Hawaii), updated in real time: Edge Function ingest → Supabase Realtime →
Next.js frontend.

## Tech Stack
- Ingest (primary): **Supabase Edge Function** (`poll-opensky`, Deno),
  triggered by **pg_cron** every minute
- Ingest (dev/alternative): **Node.js + TypeScript** worker (`worker/`),
  same logic, runs anywhere
- Data sources: **adsb.lol + airplanes.live + adsb.fi** — three keyless
  community ADS-B aggregators, rotated per anchor
- Auth: **Supabase Auth** (magic-link / implicit flow) with per-user favorites
- Database: **Supabase** (Postgres + Realtime + RLS)
- Frontend: **Next.js 16** (App Router) + Tailwind CSS v4, deployed on **Vercel**
- Map: **React Leaflet** + CARTO dark tiles; Charts: **Recharts**

## Architecture

```
adsb.lol / airplanes.live / adsb.fi  (30-anchor serial sweep, ~40 s)
                     │
                     ▼
   Supabase Edge Function `poll-opensky`  ◀── pg_cron (every minute)
   (or worker/ running the same logic)
                     │  changed rows only
                     ▼
   Supabase Postgres (flights_current + observations + user_favorites)
                     │
        logical replication → Supabase Realtime
                     │
                     ▼
   Next.js 16 on Vercel (WebSocket subscription, auto-reconnect,
   2-min snapshot reconciliation)
                     │
                     ▼
   Browser (React Leaflet, altitude-colored icons, 1 s dead-reckoning
   animation between 60 s data updates)
```

## Coverage grid
`/v2/point` caps the radius at 250 nm, so full-US coverage uses a hex
lattice of 26 anchors over CONUS (verified gap-free against a 0.25° sample
grid of the CONUS outline) plus Anchorage, Fairbanks, Juneau and Honolulu —
30 anchors total. The sweep is strictly serial (~1.15 s spacing) because
the aggregators rate-limit per IP on a per-minute budget; each anchor is
assigned a source round-robin, retries once on the next source, and is
dropped for the sweep if both fail (partial data beats no data).

## Data-Source History
1. **OpenSky Network** — blocked TCP from cloud-provider IP ranges
   (identical `ConnectTimeoutError` from Railway and Supabase Edge).
2. **adsb.lol alone** (8 parallel anchors) — worked until adsb.lol added
   per-IP-per-minute rate limits (420/429 even from residential IPs when
   bursting).
3. **Current**: serial sweep rotated across adsb.lol, airplanes.live and
   adsb.fi. All three expose the same readsb JSON; the only differences are
   the list key (`ac` vs `aircraft`) and `now` in ms vs seconds — both
   normalized in `fetchAnchor`.

## Folders
| Path | Purpose |
|------|---------|
| `supabase/migrations/` | SQL schema + pg_cron jobs + stats RPC |
| `supabase/functions/poll-opensky/` | Primary ingest (Edge Function) |
| `worker/` | Same ingest as a standalone Node service (local dev) |
| `web/` | Next.js frontend deployed to Vercel |

## Data Model
```typescript
interface Flight {
  icao24: string;           // 24-bit ICAO address, lowercase hex, PK
  callsign: string | null;  // trimmed, nullable
  origin_country: string | null; // derived from ICAO address block
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;  // meters
  velocity: number | null;       // m/s
  heading: number | null;        // 0..360 degrees
  vertical_rate: number | null;  // m/s
  on_ground: boolean;
  last_seen: string;   // ISO timestamptz — actual signal time
  updated_at: string;  // ISO timestamptz — DB write time
}
```

## Key Design Decisions
- **Two tables**: `flights_current` (one row per aircraft, upserted — what
  the browser subscribes to) vs `observations` (append-only history — used
  for per-flight charts; `observed_at` = signal time, not write time).
- **Changed-rows-only writes**: both ingest paths diff against the previous
  state (worker: in-memory cache; edge function: one paginated read of
  `flights_current`) and skip aircraft that didn't materially move, with a
  5-minute forced refresh so the 10-minute stale-row TTL never deletes a
  parked-but-alive aircraft. This cuts DB writes and Realtime fan-out.
- **Realtime only on `flights_current`**: publishing every observation
  would flood WebSocket subscribers.
- **pg_cron for TTL**: hourly sweep keeps `observations` at 3 h; 10-minute
  sweep removes stale `flights_current` rows (this emits the DELETE events
  the frontend consumes to clear landed planes).
- **Stats in SQL**: `stats_overview()` RPC aggregates server-side instead
  of shipping 100k rows to the API route.
- **`origin_country` from the ICAO address block** (Annex 10 allocation
  table subset) — the ADS-B feeds don't carry registration country.
- **Frontend resilience**: Realtime subscription auto-reconnects with
  backoff and refetches a full snapshot on every (re)subscribe plus every
  2 minutes, so a dropped WebSocket never permanently freezes the map.
- **Service role key** exists only in Edge Function secrets / worker env;
  the frontend only ever uses the anon key.

## Environment Variables
**Edge Function** (auto-injected by Supabase): `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`.

**`worker/.env`** (local dev): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

**`web/.env.local`** (Vercel): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
