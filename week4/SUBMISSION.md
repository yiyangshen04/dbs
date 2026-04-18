# Assignment 4 — Flight Tracker

## Deliverables

- **Vercel URL**: <https://flight-tracker-lilac-nine.vercel.app>
- **Background job**: Supabase Edge Function `poll-opensky`, triggered by `pg_cron` every minute
- **Data source**: adsb.lol (see reflection #2 for why this isn't OpenSky)
- **GitHub URL**: <https://github.com/yiyangshen04/dbs/tree/main/week4>

---

## Reflection Questions

### 1. Trace the data path for a single flight, from an ADS-B transponder to a pixel on the user's screen. What systems are involved?

An aircraft's Mode-S / ADS-B transponder broadcasts a position message at
978 MHz / 1090 MHz. A network of volunteer ground receivers decodes it and
forwards it to **adsb.lol**, a community aggregator. Our **Supabase Edge
Function** `poll-opensky` (Deno runtime) wakes up once per minute, fans out
eight HTTP `GET /v2/point/{lat}/{lon}/250` requests against adsb.lol to cover
the continental US, deduplicates by ICAO hex, and converts units (feet → m,
knots → m/s) at the boundary. It then opens a Supabase client with the
auto-injected service role key and does two DB writes: an `UPSERT` into
`flights_current` keyed by `icao24`, and an `INSERT` into `observations` for
the append-only history.

The `UPSERT` triggers Postgres logical replication, which Supabase Realtime
listens on. Realtime re-broadcasts the row change as a `postgres_changes`
event on the `flights_current` channel. The **Next.js 16** app on Vercel has
that channel open via a client-side `supabase.channel(...).subscribe()` in
`page.tsx`; when the event arrives over its WebSocket, the handler updates a
local `Map<icao24, Flight>` in React state. React re-renders, React Leaflet
diffs the marker set, and the aircraft's SVG icon moves on the map. The whole
aircraft-to-pixel path passes through roughly six independent systems:
transponder → ADS-B receiver → adsb.lol → Supabase Edge Function → Supabase
Postgres → Supabase Realtime → browser.

### 2. Why is the background job separate from the Next.js app? What would break if you moved the polling into a Next.js server route?

Vercel's serverless functions are built for short-lived request/response: they
spin up on an incoming HTTP request, have a 10 – 60 s wall-clock limit, and
shut down. A polling loop that has to fire every minute (or every 12 s, as
the original design called for) doesn't have a natural HTTP caller. You could
use Vercel Cron to schedule it, but cron invocations are charged as
function-seconds, cold-start every time, and are hard-capped at one call per
minute on the Hobby tier — which is exactly the reliability pattern you're
trying to avoid when ingesting live data.

Architecturally the bigger point is **decoupling**: the ingest job and the
frontend have different availability budgets and different deploy cadences.
This project validated that empirically. The original plan put the worker on
Railway as a long-running Node process, but OpenSky Network blocks TCP
connections from Railway's IP ranges (also confirmed against Supabase Edge
and likely true for most commercial cloud egress). Because the job was
separate, the fix was a clean swap: delete the Railway deployment, drop a
Deno edge function in its place, flip the data source to adsb.lol — **zero
changes to the Next.js app, the DB schema, or the frontend React code**. If
polling had been wired into a `/api/poll` route, we would have been editing
the deployed UI just to migrate the ingest layer.

### 3. How does Supabase Realtime deliver updates to the browser, and why is Realtime enabled on `flights_current` but not `observations`?

Realtime rides on Postgres logical replication. Supabase runs a dedicated
service that connects to the database's `supabase_realtime` publication,
reads WAL records as rows change, and fans them out to connected browsers
over WebSocket. Each subscribed client sees only changes on tables in the
publication. Our frontend opens one channel per tab and filters for
`postgres_changes` on `public.flights_current`; INSERT / UPDATE / DELETE
events arrive as JSON with the row before and after, which the client merges
into its in-memory `Map`.

`flights_current` is in the publication because it is the canonical "latest
state" table — one row per aircraft, upserted at most once per poll. That
yields ~1 k row changes per minute, which comfortably fits the 2 M
messages/month free tier (about 65 % utilization at steady state). The
`observations` table is specifically **not** published: it is append-only
history and grows at the same rate, so publishing it would duplicate the
message volume while delivering no new information to the UI. The UI already
has everything it needs from `flights_current`; the history table exists
only for the per-flight altitude/speed charts, which are pulled on demand via
a regular API route (`/api/history/[icao24]`) and never need to stream.

### 4. Ask Claude (with Supabase MCP) to describe your database. Paste the response. Does it match your mental model?

`mcp__supabase__execute_sql` against the schema:

```json
[
  {
    "tablename": "flights_current",
    "rls_enabled": true,
    "index_count": 3,
    "in_realtime_publication": true,
    "approx_rows": 1227
  },
  {
    "tablename": "observations",
    "rls_enabled": true,
    "index_count": 4,
    "in_realtime_publication": false,
    "approx_rows": 17351
  }
]
```

And the index definitions:

```
flights_current_pkey ON (icao24)
idx_fc_callsign      ON (callsign)
idx_fc_last_seen     ON (last_seen)

observations_pkey    ON (id)
idx_obs_icao_time    ON (icao24, observed_at DESC)
idx_obs_time         ON (observed_at)
idx_obs_callsign     ON (callsign)
```

Three scheduled `pg_cron` jobs are also in place: `poll-opensky` (every minute,
calls the edge function), `prune-observations-hourly` (deletes rows older than
6 hours), and `prune-stale-current` (removes flights unseen for 10 minutes,
which is how DELETE events reach the frontend to clear disappeared planes
from the map).

This matches the mental model exactly. `flights_current` is the narrow
upserted latest-state table, in the Realtime publication; `observations` is
the append-only history with the composite `(icao24, observed_at DESC)` index
that `/api/history/[icao24]` relies on (ORDER BY observed_at DESC LIMIT 100
becomes an index-only scan). The `idx_fc_callsign` / `idx_obs_callsign`
indexes backstop user-facing callsign search; they're flagged as unused in
`get_advisors` right now only because no one has searched yet on the live
site. RLS is enabled on both tables with public SELECT policies, matching the
app's read-only-to-the-world / writes-from-service-role-only design.
