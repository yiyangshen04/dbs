# Assignment 4 — Flight Tracker

## Deliverables

- **Vercel URL**: _TODO: paste after deploy_
- **Railway (background worker)**: _not publicly routed; confirmed via logs_
- **GitHub URL**: https://github.com/yiyangshen04/dbs/tree/main/week4

---

## Reflection Questions

### 1. Trace the data path for a single flight, from an ADS-B transponder to a pixel on the user's screen. What systems are involved?

_TODO: fill in during Step 9 — expected arc: aircraft transponder → ground ADS-B receiver → OpenSky aggregator → OpenSky REST API `/api/states/all` → Railway worker (fetch → transform → batched upsert) → Supabase Postgres (`flights_current` via `upsert`, `observations` via `insert`) → Postgres logical replication slot → Supabase Realtime broadcast → browser WebSocket → React state `Map<icao24, Flight>` → React Leaflet marker re-render._

### 2. Why is the worker separate from the Next.js app? What would break if you moved the polling into a Next.js server route?

_TODO: discuss Vercel serverless timeouts (10–60 s), lack of reliable sub-minute cron, cold-start gaps missing polls, deploy coupling, stateful vs stateless concerns. Railway is the right place for a long-running poll loop._

### 3. How does Supabase Realtime deliver updates to the browser, and why is Realtime enabled on `flights_current` but not `observations`?

_TODO: Postgres logical replication → Supabase Realtime server → per-client WebSocket channel subscribed via `supabase.channel('flights').on('postgres_changes', ...)`. `observations` would emit ~3–5k messages every 12 s, flooding subscribers and burning the free-tier 2M msg/mo quota in under 2 days. `flights_current` has the same magnitude of changes but each represents the full current state, which is exactly what the UI needs to render. One table is history, the other is "latest state"; Realtime should carry the latter._

### 4. Ask Claude (with Supabase MCP) to describe your database. Paste the response. Does it match your mental model?

_TODO: paste `mcp__supabase__list_tables` output. Expected: two tables (`flights_current`, `observations`), both RLS-enabled, `flights_current` in the `supabase_realtime` publication, indexes on `(icao24, observed_at desc)`, `observed_at`, `callsign`._
