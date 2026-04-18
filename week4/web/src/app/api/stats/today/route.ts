import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabase();

  // Last 24 hours of observations grouped by origin_country.
  // Supabase-js doesn't expose GROUP BY directly, so we do a window read and
  // aggregate in JS. This is cheap because pg_cron keeps `observations`
  // bounded to 6 hours; the TTL > 24 h case degrades gracefully with a LIMIT.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("observations")
    .select("origin_country, icao24, observed_at")
    .gte("observed_at", since)
    .limit(100_000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byCountry = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const country = (row.origin_country as string | null) ?? "Unknown";
    if (!byCountry.has(country)) byCountry.set(country, new Set());
    byCountry.get(country)!.add(row.icao24 as string);
  }

  const ranked = [...byCountry.entries()]
    .map(([origin_country, set]) => ({ origin_country, count: set.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    since,
    unique_aircraft_by_country: ranked,
    total_rows_scanned: data?.length ?? 0,
  });
}
