import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import type { Flight } from "@/lib/types";

export const dynamic = "force-dynamic";

// PostgREST caps a single response (default 1000 rows), so page through
// with .range() — full-US coverage is well past one page.
const PAGE = 1000;
const MAX_ROWS = 10_000;

export async function GET() {
  const supabase = createServerSupabase();
  const flights: Flight[] = [];

  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from("flights_current")
      .select("*")
      .order("icao24") // stable key ordering so pages never overlap
      .range(from, from + PAGE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    flights.push(...((data ?? []) as Flight[]));
    if ((data?.length ?? 0) < PAGE) break;
  }

  return NextResponse.json({ flights });
}
