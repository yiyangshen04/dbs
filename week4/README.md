# Flight Tracker — Local Development

Live aircraft positions over the continental US. See [CLAUDE.md](./CLAUDE.md) for architecture.

## Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project
- (Optional) a free [OpenSky Network](https://opensky-network.org/) account for higher rate limits

## 1. Set up the database

1. Create a Supabase project at <https://supabase.com/dashboard>.
2. Enable the `pg_cron` extension: **Database → Extensions → pg_cron → enable**.
3. In the SQL editor, paste and run `supabase/migrations/0001_init.sql`.
4. Confirm under **Database → Replication** that `flights_current` is in the `supabase_realtime` publication.
5. Copy the project URL, anon key, and service role key from **Project Settings → API**.

## 2. Run the worker locally

```bash
cd worker
cp .env.example .env
# fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

Within ~1 minute you should see log lines like
`[poll] wrote 3200 flights_current, 3200 observations` every 12 s.

Verify in the Supabase **Table Editor**: `flights_current` should have ~2–5k rows.

## 3. Run the frontend locally

```bash
cd web
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open <http://localhost:3000>. You should see a map of the US with plane markers that move without reloading the page.

## 4. Deploy

**Worker → Railway**: push `worker/` to a GitHub repo, connect it on Railway, set the same env vars. Start command `npm start`. Railway picks up `nixpacks.toml` automatically.

**Frontend → Vercel**: import this repo, set **Root Directory** to `week4/web`, set the two `NEXT_PUBLIC_*` env vars. Never add the service role key here.

## Verification checklist
See [SUBMISSION.md](./SUBMISSION.md) for the full end-to-end demo script.
