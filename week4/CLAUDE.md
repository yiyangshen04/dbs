# Flight Tracker

A live map of aircraft over the continental US, updated in real time via a background worker → Supabase Realtime → Next.js frontend.

## Tech Stack
- Background worker: **Node.js + TypeScript** on **Railway**, polling every 15 s
- Auth: **Supabase Auth** (magic-link / implicit flow) with per-user favorites
- Database: **Supabase** (Postgres + Realtime + RLS)
- Frontend: **Next.js 16** (App Router) + Tailwind CSS v4, deployed on **Vercel**
- Map: **React Leaflet** + OpenStreetMap tiles
- Charts: **Recharts**
- External data source: **adsb.lol** community ADS-B feed (keyless)

## Architecture

```
adsb.lol /v2/point ──▶  Railway worker (Node, fan-out 8 anchors, every 15 s)
                                     │
                                     ▼
                       Supabase Postgres (flights_current + observations
                                                + user_favorites)
                                     │
                       logical replication → Supabase Realtime
                                     │
                                     ▼
                       Next.js 16 on Vercel (WebSocket subscription)
                                     │
                                     ▼
                               Browser (React Leaflet map)
```

## Standby Path

A Supabase Edge Function (`poll-opensky`) is also deployed with the same
ingest logic in Deno. It isn't currently scheduled — the Railway worker is
the primary. To fail over to the edge path, re-enable the pg_cron job:

```sql
select cron.schedule('poll-opensky', '* * * * *', ...);
```

This gave us a smoke-tested fallback during the Railway debugging phase and
is kept deployed as a safety net.

## Data-Source Pivot

The project originally polled **OpenSky Network**. OpenSky blocks TCP
connections from major cloud provider IP ranges (we saw the same
`ConnectTimeoutError` from both Railway and Supabase Edge — local / Anthropic
servers still reach it fine, so it's an IP-level block, not our code).

Switched to **adsb.lol**, a community-run ADS-B aggregator with no cloud-IP
block. Because the hosted service blocks the hostname but does not otherwise
block Railway's HTTP fetch, Railway came back online the moment we swapped
the target host. Field mapping and unit conversions live in
`worker/src/transform.ts` (adsb.lol returns altitude in feet, speed in knots).

## Folders
| Path | Purpose |
|------|---------|
| `supabase/migrations/` | SQL schema + pg_cron jobs |
| `worker/` | Polling service deployed to Railway |
| `web/` | Next.js frontend deployed to Vercel |

## Data Model
```typescript
interface Flight {
  icao24: string;           // 24-bit ICAO address, lowercase hex, PK
  callsign: string | null;  // trimmed, nullable
  origin_country: string | null;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;  // meters
  velocity: number | null;       // m/s
  heading: number | null;        // 0..360 degrees
  vertical_rate: number | null;  // m/s
  on_ground: boolean;
  last_seen: string;   // ISO timestamptz
  updated_at: string;  // ISO timestamptz
}
```

## Key Design Decisions
- **Worker separate from Next.js**: Vercel serverless functions are short-lived and lack reliable cron; Railway is purpose-built for long-running processes.
- **Two tables**: `flights_current` (one row per aircraft, upserted — what the browser subscribes to) vs `observations` (append-only history — used for per-flight charts).
- **Realtime only on `flights_current`**: publishing every observation would flood WebSocket subscribers and burn the free-tier 2M msg/mo quota in ~2 days.
- **pg_cron for TTL**: hourly sweep keeps `observations` bounded; 10-minute sweep removes stale `flights_current` rows.
- **Service role key stays on Railway**: the frontend only ever uses the anon key.

## Environment Variables
**`worker/.env`** (Railway):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENSKY_USERNAME` (optional — free OpenSky account for higher rate limit)
- `OPENSKY_PASSWORD` (optional)

**`web/.env.local`** (Vercel):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
