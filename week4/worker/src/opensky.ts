import { BBOX } from "./config.js";

// OpenSky returns each aircraft as a positional array, not a JSON object.
// Document the indices here and in ./transform.ts — treat this as the
// single source of truth for the mapping.
//
//  0  icao24           string    24-bit ICAO address (lowercase hex) — our PK
//  1  callsign         string    May have trailing spaces, trim them
//  2  origin_country   string
//  3  time_position    number?   Unix seconds of last position update
//  4  last_contact     number    Unix seconds of last ADS-B signal
//  5  longitude        number?
//  6  latitude         number?
//  7  baro_altitude    number?   Meters, barometric
//  8  on_ground        boolean
//  9  velocity         number?   m/s over ground
// 10  true_track       number?   Degrees clockwise from north
// 11  vertical_rate    number?   m/s
// 12  sensors          number[]? Ignore
// 13  geo_altitude     number?   Ignore
// 14  squawk           string?   Ignore
// 15  spi              boolean   Ignore
// 16  position_source  number    Ignore
export type RawState = [
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

export interface OpenSkyResponse {
  time: number;
  states: RawState[] | null;
}

export async function fetchStates(): Promise<OpenSkyResponse> {
  const url =
    `https://opensky-network.org/api/states/all` +
    `?lamin=${BBOX.lamin}&lomin=${BBOX.lomin}` +
    `&lamax=${BBOX.lamax}&lomax=${BBOX.lomax}`;

  const headers: Record<string, string> = {};
  const user = process.env.OPENSKY_USERNAME;
  const pass = process.env.OPENSKY_PASSWORD;
  if (user && pass) {
    headers.Authorization =
      "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenSky ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as OpenSkyResponse;
}
