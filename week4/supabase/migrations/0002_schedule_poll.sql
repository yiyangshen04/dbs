-- Schedule the poll-opensky Edge Function to run every minute via pg_cron.
-- Credentials for adsb.lol aren't needed (keyless), but leaving the vault
-- lookup pattern in place so future data sources with auth can piggyback.

-- pg_net provides HTTP from inside Postgres.
create extension if not exists pg_net with schema extensions;

-- Unschedule if already present (makes this migration re-runnable).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'poll-opensky') then
    perform cron.unschedule('poll-opensky');
  end if;
end $$;

-- Call the edge function once per minute.
-- The anon key authorizes the JWT gate on the function; the function
-- itself uses the auto-injected service role key to write to the DB.
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
      body := '{}'::jsonb
    );
  $$
);
