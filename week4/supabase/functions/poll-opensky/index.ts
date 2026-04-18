// Supabase Edge Function (Deno runtime).
// Triggered by pg_cron every minute. Pulls aircraft positions from OpenSky
// Network and upserts them into Supabase. Replaces the Railway worker —
// Railway's egress had a chronic undici/fetch issue against OpenSky.
//
// Scheduling is defined in supabase/migrations/0002_schedule_poll.sql.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BBOX = { lamin: 24, lomin: -125, lamax: 49, lomax: -66 };
const MAX_STATE_AGE_SECONDS = 5 * 60;
const CHUNK = 1000;

// Positional-array indices — mirror of worker/src/opensky.ts.
type RawState = [
  string,
  string | null,
  string,
  number | null,
  number,
  number | null,
  number | null,
  number | null,
  boolean,
  number | null,
  number | null,
  number | null,
  number[] | null,
  number | null,
  string | null,
  boolean,
  number,
];

interface FlightRow {
  icao24: string;
  callsign: string | null;
  origin_country: string | null;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  velocity: number | null;
  heading: number | null;
  vertical_rate: number | null;
  on_ground: boolean;
  last_seen: string;
}

// OAuth2 token cache. Each function instance keeps one across warm
// invocations; cold starts re-auth (cheap).
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(
  clientId: string | null,
  clientSecret: string | null,
): Promise<string | null> {
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const res = await fetch(
    "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`token ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

function transformStates(
  states: RawState[] | null,
  now = Math.floor(Date.now() / 1000),
): FlightRow[] {
  if (!states) return [];
  const rows: FlightRow[] = [];
  for (const s of states) {
    const icao24 = s[0];
    const longitude = s[5];
    const latitude = s[6];
    if (!icao24) continue;
    if (longitude === null || latitude === null) continue;

    const freshest = Math.max(s[3] ?? 0, s[4] ?? 0);
    if (freshest && now - freshest > MAX_STATE_AGE_SECONDS) continue;

    const callsignRaw = s[1];
    const callsign = callsignRaw ? callsignRaw.trim() || null : null;
    const lastSeenEpoch = freshest || now;

    rows.push({
      icao24: icao24.toLowerCase(),
      callsign,
      origin_country: s[2] || null,
      longitude,
      latitude,
      baro_altitude: s[7],
      velocity: s[9],
      heading: s[10],
      vertical_rate: s[11],
      on_ground: Boolean(s[8]),
      last_seen: new Date(lastSeenEpoch * 1000).toISOString(),
    });
  }
  return rows;
}

Deno.serve(async (req) => {
  const started = Date.now();
  try {
    // Credentials may come from (1) the request body — this is how pg_cron
    // forwards them after reading from Supabase Vault — or (2) Deno env
    // vars for local dev.
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const clientId =
      (body.opensky_client_id as string | undefined) ??
      Deno.env.get("OPENSKY_CLIENT_ID") ??
      null;
    const clientSecret =
      (body.opensky_client_secret as string | undefined) ??
      Deno.env.get("OPENSKY_CLIENT_SECRET") ??
      null;

    const url =
      `https://opensky-network.org/api/states/all` +
      `?lamin=${BBOX.lamin}&lomin=${BBOX.lomin}` +
      `&lamax=${BBOX.lamax}&lomax=${BBOX.lomax}`;

    const token = await getAccessToken(clientId, clientSecret);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`opensky ${res.status}: ${body.slice(0, 200)}`);
    }
    const { states } = (await res.json()) as {
      time: number;
      states: RawState[] | null;
    };

    const rows = transformStates(states);

    // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by
    // Supabase into every edge function's environment.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const updatedAt = new Date().toISOString();
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const stamped = slice.map((r) => ({ ...r, updated_at: updatedAt }));
      const { error } = await supabase
        .from("flights_current")
        .upsert(stamped, { onConflict: "icao24" });
      if (error) throw new Error(`upsert flights_current: ${error.message}`);
    }

    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows
        .slice(i, i + CHUNK)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ last_seen: _ls, ...rest }) => rest);
      const { error } = await supabase.from("observations").insert(slice);
      if (error) throw new Error(`insert observations: ${error.message}`);
    }

    const ms = Date.now() - started;
    console.log(
      `[poll] wrote ${rows.length} flights in ${ms} ms ` +
        `(raw states: ${states?.length ?? 0})`,
    );
    return Response.json({
      ok: true,
      flights: rows.length,
      raw: states?.length ?? 0,
      ms,
    });
  } catch (err) {
    const e = err as Error & { cause?: unknown };
    const causeMsg =
      e.cause instanceof Error ? `${e.cause.name}: ${e.cause.message}` : String(e.cause ?? "");
    console.error(
      `[poll] failure: ${e.message}${causeMsg ? ` (cause: ${causeMsg})` : ""}`,
    );
    return Response.json(
      { ok: false, error: e.message, cause: causeMsg || undefined },
      { status: 500 },
    );
  }
});
