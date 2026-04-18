# Flight Tracker

A live map of aircraft over the continental US, updated in real time via a background worker → Supabase Realtime → Next.js frontend.

## Tech Stack
- Background job: **Supabase Edge Function** (Deno) triggered by **pg_cron** every minute
- Database: **Supabase** (Postgres + Realtime)
- Frontend: **Next.js 16** (App Router) + Tailwind CSS v4, deployed on **Vercel**
- Map: **React Leaflet** + OpenStreetMap tiles
- Charts: **Recharts**
- External data source: **adsb.lol** community ADS-B feed (keyless)

## Architecture

```
adsb.lol /v2/point ──▶  Supabase Edge Function (poll-opensky, fan-out 8 anchors)
                                     │
                                     ▼
                       Supabase Postgres (flights_current + observations)
                                     │
                       logical replication → Supabase Realtime
                                     │
                                     ▼
                       Next.js 16 on Vercel (WebSocket subscription)
                                     │
                                     ▼
                               Browser (React Leaflet map)

Scheduling: pg_cron `* * * * *` → pg_net.http_post → Edge Function
```

## Deployment Notes

This project originally targeted the MPCS reference architecture (Railway worker
polling OpenSky Network every 12 s). Two externalities forced a pivot:

1. **OpenSky blocks cloud provider IPs.** Confirmed TCP connect timeouts from
   both Railway and Supabase Edge to `opensky-network.org:443`. Local machines
   and Anthropic servers still reach it fine — this is an IP-level block.
2. **Railway's Node fetch has a chronic undici timeout issue.** Separate
   problem, same symptom. [Reference thread](https://station.railway.com/questions/node-js-native-fetch-not-working-conne-08832b48).

**Final architecture**:
- Data source swapped from OpenSky → **adsb.lol** (community feed; no cloud-IP
  block).
- Worker swapped from always-on Node on Railway → **Supabase Edge Function**
  triggered by pg_cron every minute. Everything now runs inside Supabase.
- Polling interval: 12 s → 60 s (pg_cron minimum granularity).

The original Node worker code is kept under `worker/` for reference and local
development (`npm run dev` reads from `worker/.env`). It still works fine when
run from a residential IP.

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
