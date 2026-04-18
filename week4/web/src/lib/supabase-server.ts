import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Use the anon key here — our read endpoints go through RLS, which grants
// public SELECT on both tables. The service role key never leaves the worker.
export function createServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
