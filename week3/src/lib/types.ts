export interface Country {
  name: { common: string; official: string };
  cca3: string;
  capital?: string[];
  region: string;
  subregion?: string;
  population: number;
  area?: number;
  flags: { svg: string; png: string; alt?: string };
  languages?: Record<string, string>;
  currencies?: Record<string, { name: string; symbol: string }>;
  latlng?: [number, number];
  maps?: { googleMaps: string; openStreetMaps: string };
  timezones?: string[];
  continents?: string[];
}

export interface SavedCountry {
  id: string;
  user_id: string;
  country_code: string;
  country_name: string;
  flag_url: string;
  region: string;
  notes: string | null;
  visited: boolean;
  created_at: string;
}
