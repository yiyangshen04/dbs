import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Aggregation happens in Postgres (see supabase/migrations/0003) — one JSON
// blob back instead of the old pattern of shipping 100k rows to Node and
// grouping in JS.
export async function GET() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.rpc("stats_overview");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? {});
}
