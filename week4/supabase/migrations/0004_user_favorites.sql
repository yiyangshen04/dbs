-- ============================================================
-- 0004 — user_favorites
-- The table originally only existed on the first Supabase project
-- (created ad-hoc via the dashboard) and was never captured in a
-- migration, so fresh-project setup silently shipped a broken
-- favorites feature. Idempotent / re-runnable.
-- ============================================================

create table if not exists public.user_favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  callsign   text not null,
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, callsign)
);

create index if not exists idx_uf_user_created
  on public.user_favorites (user_id, created_at desc);

-- Row-Level Security: users only ever see and touch their own rows,
-- even though the browser talks to PostgREST with the shared anon key.
alter table public.user_favorites enable row level security;

drop policy if exists "uf select own" on public.user_favorites;
create policy "uf select own"
  on public.user_favorites for select
  using (auth.uid() = user_id);

drop policy if exists "uf insert own" on public.user_favorites;
create policy "uf insert own"
  on public.user_favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "uf update own" on public.user_favorites;
create policy "uf update own"
  on public.user_favorites for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "uf delete own" on public.user_favorites;
create policy "uf delete own"
  on public.user_favorites for delete
  using (auth.uid() = user_id);
