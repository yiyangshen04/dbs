# Assignment 4 — Flight Tracker

## Deliverables

- **Vercel URL**: <https://flight-tracker-lilac-nine.vercel.app>
- **Railway worker**: `flight-tracker-worker` project, Node/TypeScript, polls adsb.lol every 15 s
- **Supabase project**: `nokjkiqzsyqrupmyswkm` — Postgres + Realtime + Auth + RLS
- **GitHub URL**: <https://github.com/yiyangshen04/dbs/tree/main/week4>

### How a classmate uses it

1. Open the Vercel URL — map loads with ~5 k live flights over the continental US.
2. Click **Sign in** (top right), enter email, click the magic link → signed in.
3. Click any aircraft → detail panel → click ☆ **Save** to pin it to the
   personal favorites list in the left sidebar. Saves persist across reloads.

---

## Reflection Questions

### 1. Trace the data path for a single flight, from an ADS-B transponder to a pixel on the user's screen. What systems are involved?

An aircraft's Mode-S / ADS-B transponder broadcasts a position message at
978 MHz / 1090 MHz. A network of volunteer ground receivers decodes it and
forwards it to **adsb.lol**, a community aggregator. A **Railway worker**
(long-running Node/TypeScript process) wakes up every 15 s, fans out eight
concurrent `GET /v2/point/{lat}/{lon}/250` requests against adsb.lol to cover
the continental US, deduplicates by ICAO hex, and converts units (feet → m,
knots → m/s) at the boundary. It then opens a Supabase client with the
service role key and does two DB writes: an `UPSERT` into `flights_current`
keyed by `icao24`, and an `INSERT` into `observations` for the append-only
history.

The `UPSERT` triggers Postgres logical replication, which Supabase Realtime
listens on. Realtime re-broadcasts the row change as a `postgres_changes`
event on the `flights_current` channel. The **Next.js 16** app on Vercel has
that channel open via a client-side `supabase.channel(...).subscribe()` in
`page.tsx`; when the event arrives over its WebSocket, the handler updates a
local `Map<icao24, Flight>` in React state. React re-renders, React Leaflet
diffs the marker set, and the aircraft's SVG icon moves on the map. The whole
aircraft-to-pixel path passes through six independent systems: transponder →
ADS-B receiver → adsb.lol → Railway worker → Supabase Postgres → Supabase
Realtime → browser.

### 2. Why is the Railway worker separate from the Next.js app? What would break if you moved the polling into a Next.js server route?

Vercel's serverless functions are built for short-lived request/response:
they spin up on an incoming HTTP request, have a 10 – 60 s wall-clock limit,
and shut down. A polling loop that has to fire every 15 s doesn't have a
natural HTTP caller. You could use Vercel Cron to schedule it, but cron
invocations cold-start every time and are hard-capped at one call per minute
on the Hobby tier — which is exactly the reliability pattern you're trying
to avoid when ingesting live data that ages out within seconds.

Architecturally the bigger point is **decoupling**. This project validated
that empirically in two different ways:

1. The **data source** changed mid-build. We started on OpenSky Network, but
   OpenSky blocks TCP connections from commercial cloud IP ranges (confirmed
   from both Railway and Supabase Edge — same `ConnectTimeoutError`). Because
   the ingest job was a separate service, we swapped to adsb.lol by editing
   one worker file (`worker/src/opensky.ts`) — no schema change, no frontend
   change, no redeploy of the Vercel app.
2. The **compute platform** itself briefly moved. While debugging OpenSky, we
   shipped a **Supabase Edge Function** triggered by pg_cron as a fallback
   ingest path. It ran end-to-end without touching the Next.js app. Once the
   Railway worker worked again (against adsb.lol), we flipped ingest back to
   Railway by unscheduling the cron — the edge function is still deployed as
   a warm standby. Swapping ingest platforms with zero frontend churn is
   exactly what the decoupled architecture buys you.

If polling had been wired into a `/api/poll` route, every one of those
migrations would have required editing the deployed UI.

### 3. How does Supabase Realtime deliver updates to the browser, and why is Realtime enabled on `flights_current` but not `observations`?

Realtime rides on Postgres logical replication. Supabase runs a dedicated
service that connects to the database's `supabase_realtime` publication,
reads WAL records as rows change, and fans them out to connected browsers
over WebSocket. Each subscribed client sees only changes on tables in the
publication. Our frontend opens one channel per tab and filters for
`postgres_changes` on `public.flights_current`; INSERT / UPDATE / DELETE
events arrive as JSON with the row before and after, and the client merges
them into its in-memory `Map`.

`flights_current` is in the publication because it is the canonical
"latest state" table — one row per aircraft, upserted at most once per
15-second poll. That yields ~5 k row changes every 15 s = ~20 k/min at peak.
`observations` is specifically **not** published: it is append-only history
that grows at the same rate, so publishing it would duplicate the Realtime
message volume while delivering no new information to the UI. The UI already
has everything it needs from `flights_current`; the history table exists
only for the per-flight altitude/speed charts, which are pulled on demand
via a regular API route (`/api/history/[icao24]`) and never need to stream.

### 4. Ask Claude (with Supabase MCP) to describe your database. Paste the response. Does it match your mental model?

`mcp__supabase__execute_sql` against the schema:

```json
[
  {
    "tablename": "flights_current",
    "rls_enabled": true,
    "indexes": ["pkey(icao24)", "idx_fc_callsign", "idx_fc_last_seen"],
    "in_realtime_publication": true
  },
  {
    "tablename": "observations",
    "rls_enabled": true,
    "indexes": ["pkey(id)", "idx_obs_icao_time(icao24, observed_at DESC)",
                "idx_obs_time", "idx_obs_callsign"],
    "in_realtime_publication": false
  },
  {
    "tablename": "user_favorites",
    "rls_enabled": true,
    "indexes": ["pkey(id)", "unique(user_id, callsign)",
                "idx_uf_user_created", "idx_uf_callsign"],
    "in_realtime_publication": false,
    "policies": [
      "uf select own: auth.uid() = user_id",
      "uf insert own: auth.uid() = user_id",
      "uf update own: auth.uid() = user_id",
      "uf delete own: auth.uid() = user_id"
    ]
  }
]
```

Two active `pg_cron` jobs: `prune-observations-hourly` (TTL sweep of the
history table at :07 each hour) and `prune-stale-current` (deletes
`flights_current` rows not seen in 10 minutes, which is how DELETE events
reach the frontend to clear disappeared planes from the map).

This matches the mental model exactly. `flights_current` is the narrow
upserted latest-state table in the Realtime publication; `observations` is
the append-only history with the composite `(icao24, observed_at DESC)`
index that `/api/history/[icao24]` relies on. The `user_favorites` table is
user-partitioned via four tight `auth.uid() = user_id` RLS policies — two
users never see each other's data even though both use the same anon key
from the browser. RLS is how we get multi-tenancy without server-side
session bookkeeping.
