import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// ~2 hours of track at the 1-minute ingest cadence.
const MAX_POINTS = 120;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ icao24: string }> },
) {
  const { icao24 } = await params;
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("observations")
    .select("*")
    .eq("icao24", icao24.toLowerCase())
    .order("observed_at", { ascending: false })
    .limit(MAX_POINTS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Oldest-first for the chart x-axis.
  const ordered = (data ?? []).slice().reverse();
  return NextResponse.json({ observations: ordered });
}
