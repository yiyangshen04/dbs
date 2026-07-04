export interface Flight {
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
  updated_at: string;
}

export interface Observation {
  id: number;
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
  observed_at: string;
}

export interface CountryCount {
  origin_country: string;
  count: number;
}

// Shape returned by the stats_overview() Postgres function
// (see supabase/migrations/0003_full_us_optimize.sql).
export interface StatsOverview {
  tracked_now: number;
  airborne: number;
  avg_velocity_mps: number | null;
  by_country: CountryCount[];
  unique_aircraft_3h: number;
  observations_3h: number;
  generated_at: string;
}
