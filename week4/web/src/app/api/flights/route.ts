import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import type { Flight } from "@/lib/types";

export const dynamic = "force-dynamic";

// PostgREST caps a single response (default 1000 rows), so page through.
// Keyset pagination (icao24 > last key) rather than offsets: the TTL prune
// deletes rows between requests, and shifting offsets would silently skip
// rows that moved down a page.
const PAGE = 1000;
const MAX_ROWS = 20_000;

export async function GET() {
  const supabase = createServerSupabase();
  const flights: Flight[] = [];
  let lastKey = "";

  while (flights.length < MAX_ROWS) {
    let q = supabase
      .from("flights_current")
      .select("*")
      .order("icao24")
      .limit(PAGE);
    if (lastKey) q = q.gt("icao24", lastKey);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const page = (data ?? []) as Flight[];
    flights.push(...page);
    if (page.length < PAGE) break;
    lastKey = page[page.length - 1].icao24;
  }

  if (flights.length >= MAX_ROWS) {
    console.warn(`[flights] snapshot truncated at ${MAX_ROWS} rows`);
  }
  return NextResponse.json({ flights });
}
