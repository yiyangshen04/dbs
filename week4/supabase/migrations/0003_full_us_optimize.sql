-- ============================================================
-- 0003 — Full-US monitoring + optimizations
-- Safe to paste into the Supabase SQL editor as one script;
-- every statement is idempotent / re-runnable.
-- ============================================================

-- 1) Drop write-amplifying indexes nothing queries.
--    Search happens client-side in memory; history lookups use
--    idx_obs_icao_time; the TTL sweep uses idx_obs_time.
drop index if exists public.idx_obs_callsign;
drop index if exists public.idx_fc_callsign;

-- 2) Server-side stats aggregation. Replaces the old pattern of shipping
--    up to 100k observation rows to the Next.js route and grouping in JS.
--    SECURITY DEFINER (owner: postgres) so the aggregate runs without
--    per-row RLS checks; both tables are public-read anyway.
create or replace function public.stats_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select jsonb_build_object(
    'tracked_now',      (select count(*) from flights_current),
    'airborne',         (select count(*) from flights_current where not on_ground),
    'avg_velocity_mps', (select round(avg(velocity)::numeric, 1)
                           from flights_current
                          where velocity is not null and not on_ground),
    'by_country',       (select coalesce(jsonb_agg(t), '[]'::jsonb)
                           from (select coalesce(origin_country, 'Other') as origin_country,
                                        count(*) as count
                                   from flights_current
                                  group by 1
                                  order by 2 desc
                                  limit 10) t),
    'unique_aircraft_3h', (select count(distinct icao24) from observations
                            where observed_at > now() - interval '3 hours'),
    'observations_3h',    (select count(*) from observations
                            where observed_at > now() - interval '3 hours'),
    'generated_at',       now()
  );
$fn$;

grant execute on function public.stats_overview() to anon, authenticated;

-- 2b) Ingest lock. The 1-minute cron fires regardless of how long the
--     previous sweep took; a degraded sweep (source timeouts) can exceed
--     60 s, and overlapping sweeps would double the aggregator request
--     rate — amplifying the very rate limits the serial design avoids.
--     The Edge Function claims this row atomically (UPDATE ... WHERE
--     locked_until < now()) before sweeping and releases it afterwards;
--     the TTL bounds the damage if a run dies without releasing.
--     RLS enabled with no policies: only the service role can touch it.
create table if not exists public.ingest_lock (
  id           int primary key,
  locked_until timestamptz not null default 'epoch'
);
insert into public.ingest_lock (id) values (1) on conflict (id) do nothing;
alter table public.ingest_lock enable row level security;

-- 3) Observations TTL 6h → 3h. The per-flight charts read the last ~120
--    points (~2h at the 1-minute cadence), so 3h is plenty and halves the
--    table's steady-state size.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'prune-observations-hourly') then
    perform cron.unschedule('prune-observations-hourly');
  end if;
end $$;

select cron.schedule(
  'prune-observations-hourly',
  '7 * * * *',
  $$ delete from public.observations where observed_at < now() - interval '3 hours'; $$
);

-- Re-assert the stale-current sweep (unchanged, kept for idempotency —
-- this is what emits the DELETE events that clear landed planes from the map).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'prune-stale-current') then
    perform cron.unschedule('prune-stale-current');
  end if;
end $$;

select cron.schedule(
  'prune-stale-current',
  '*/10 * * * *',
  $$ delete from public.flights_current where last_seen < now() - interval '10 minutes'; $$
);

-- 4) Re-enable the Edge Function ingest, once per minute. The function
--    ACKs with 202 immediately and sweeps in the background, so the
--    pg_net timeout only needs to cover the handshake.
--    (The bearer token is the project's public anon key — the function's
--    JWT gate needs it; writes inside the function use the service role.)
create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'poll-opensky') then
    perform cron.unschedule('poll-opensky');
  end if;
end $$;

select cron.schedule(
  'poll-opensky',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://nokjkiqzsyqrupmyswkm.supabase.co/functions/v1/poll-opensky',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5va2praXF6c3lxcnVwbXlzd2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjIzMTIsImV4cCI6MjA5MTY5ODMxMn0.ByRS9cYS_CuHmCGyP4Funa6spUCbo9RDJHGUeOKi7n0',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 8000
    );
  $$
);
