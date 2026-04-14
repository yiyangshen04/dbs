import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("saved_countries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("saved_countries")
    .upsert(
      {
        user_id: userId,
        country_code: body.country_code,
        country_name: body.country_name,
        flag_url: body.flag_url,
        region: body.region,
        notes: body.notes || null,
        visited: body.visited || false,
      },
      { onConflict: "user_id,country_code" }
    )
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data);
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const countryCode = searchParams.get("country_code");

  if (!countryCode) {
    return Response.json(
      { error: "country_code is required" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("saved_countries")
    .delete()
    .eq("user_id", userId)
    .eq("country_code", countryCode);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { country_code, ...updates } = body;

  if (!country_code) {
    return Response.json(
      { error: "country_code is required" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("saved_countries")
    .update(updates)
    .eq("user_id", userId)
    .eq("country_code", country_code)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data);
}
