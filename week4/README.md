# US Airspace Monitor — Local Development

Live aircraft positions over the **entire United States** (CONUS + Alaska +
Hawaii). See [CLAUDE.md](./CLAUDE.md) for architecture.

## Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project
- No data-source account needed — ingest uses three keyless community
  ADS-B aggregators (adsb.lol, airplanes.live, adsb.fi) in rotation

## 1. Set up the database

1. Create a Supabase project at <https://supabase.com/dashboard>.
2. Enable the `pg_cron` extension: **Database → Extensions → pg_cron → enable**.
3. In the SQL editor, run `supabase/migrations/0001_init.sql`, then
   `0003_full_us_optimize.sql`, then `0004_user_favorites.sql` (all
   idempotent). **Skip `0002`** — it is the historical first version of the
   cron job and 0003 supersedes it. On a fresh project, first edit the
   project URL and anon key inside 0003's `poll-opensky` cron block —
   the committed values point at the original course project.
4. Confirm under **Database → Replication** that `flights_current` is in the
   `supabase_realtime` publication.
5. Copy the project URL, anon key, and service role key from
   **Project Settings → API**.

## 2. Ingest

Two interchangeable ingest paths write the same tables:

**a) Supabase Edge Function (primary, zero extra hosting).**
```bash
supabase functions deploy poll-opensky --project-ref <your-ref>
```
The `poll-opensky` pg_cron job (created by migration 0003) then triggers it
every minute. Each run sweeps a 30-anchor grid covering the whole US
(serially, ~40 s — the aggregators rate-limit per IP, so requests are spaced
and rotated across three mirror sources).

Manual test: `curl -X POST "https://<ref>.supabase.co/functions/v1/poll-opensky?sync=1" -H "Authorization: Bearer <anon-key>"`

**b) Local / hosted worker (same logic, useful for development).**
```bash
cd worker
cp .env.example .env   # fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```
Within ~1 minute you should see
`[poll] upserted 1234, skipped 56 unchanged (raw ... anchors 30 ok / 0 failed)`.
If you run the worker, unschedule the Edge Function cron first
(`select cron.unschedule('poll-opensky');`) so the two paths don't race.

## 3. Run the frontend locally

```bash
cd web
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open <http://localhost:3000> — a dark ops-style map of the US with
altitude-colored aircraft that move without reloading the page. Use the
CONUS / Alaska / Hawaii buttons (top right) to jump between regions.

## 4. Deploy

**Frontend → Vercel**: import this repo, set **Root Directory** to
`week4/web`, set the two `NEXT_PUBLIC_*` env vars. Never add the service
role key here.

**Ingest** already runs inside Supabase (Edge Function + pg_cron), so no
other hosting is required.

## Coverage grid

The 250 nm `/point` radius cap means full-US coverage needs a grid:
26 hex-lattice anchors over CONUS (verified gap-free against a 0.25°
sample of the CONUS outline) + Anchorage, Fairbanks, Juneau, Honolulu.

## Assignment write-up
[SUBMISSION.md](./SUBMISSION.md) is the original week-4 submission, kept as
a historical record — it describes the earlier Railway + single-source
architecture, which this revision replaced.
