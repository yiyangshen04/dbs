-- ============================================================
-- Flight Tracker — initial schema
-- MPCS 51238 Assignment 4
-- ============================================================

-- 1) Append-only history. One row per aircraft per poll.
create table if not exists public.observations (
  id             bigserial primary key,
  icao24         text        not null,
  callsign       text,
  origin_country text,
  longitude      double precision,
  latitude       double precision,
  baro_altitude  double precision,   -- meters
  velocity       double precision,   -- m/s over ground
  heading        double precision,   -- degrees 0..360
  vertical_rate  double precision,   -- m/s
  on_ground      boolean     not null default false,
  observed_at    timestamptz not null default now()
);

create index if not exists idx_obs_icao_time on public.observations (icao24, observed_at desc);
create index if not exists idx_obs_time      on public.observations (observed_at);
create index if not exists idx_obs_callsign  on public.observations (callsign);

-- 2) Latest state per aircraft. This is what the browser subscribes to.
create table if not exists public.flights_current (
  icao24          text primary key,
  callsign        text,
  origin_country  text,
  longitude       double precision,
  latitude        double precision,
  baro_altitude   double precision,
  velocity        double precision,
  heading         double precision,
  vertical_rate   double precision,
  on_ground       boolean not null default false,
  last_seen       timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_fc_callsign  on public.flights_current (callsign);
create index if not exists idx_fc_last_seen on public.flights_current (last_seen);

-- 3) Row-Level Security. Anon key gets read-only access.
-- The worker uses the service role key, which bypasses RLS.
alter table public.flights_current enable row level security;
alter table public.observations    enable row level security;

drop policy if exists "fc public read"  on public.flights_current;
drop policy if exists "obs public read" on public.observations;

create policy "fc public read"
  on public.flights_current for select
  using (true);

create policy "obs public read"
  on public.observations for select
  using (true);

-- 4) Realtime. Publish ONLY flights_current.
-- observations would flood subscribers and burn the free-tier quota.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'flights_current'
  ) then
    alter publication supabase_realtime add table public.flights_current;
  end if;
end $$;

-- 5) pg_cron cleanup.
-- Enable the extension in the Supabase dashboard first:
--   Database → Extensions → pg_cron → enable.
create extension if not exists pg_cron;

-- Prune observations older than 6 hours (runs at :07 every hour).
select cron.schedule(
  'prune-observations-hourly',
  '7 * * * *',
  $$ delete from public.observations where observed_at < now() - interval '6 hours'; $$
);

-- Drop planes we haven't seen in 10 minutes (they left the bbox or landed far away).
-- This is what produces the DELETE events the frontend consumes for cleanup.
select cron.schedule(
  'prune-stale-current',
  '*/10 * * * *',
  $$ delete from public.flights_current where last_seen < now() - interval '10 minutes'; $$
);
