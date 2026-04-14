import { Country } from "./types";

const BASE_URL = "https://restcountries.com/v3.1";

// Fewer fields for list views (API has a field count limit)
const LIST_FIELDS = "name,cca3,capital,region,subregion,population,flags";

// Full detail: fetch without field filter to get everything
export async function getAllCountries(): Promise<Country[]> {
  try {
    const res = await fetch(`${BASE_URL}/all?fields=${LIST_FIELDS}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function searchCountries(name: string): Promise<Country[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/name/${encodeURIComponent(name)}?fields=${LIST_FIELDS}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getCountriesByRegion(
  region: string
): Promise<Country[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/region/${encodeURIComponent(region)}?fields=${LIST_FIELDS}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getCountryByCode(
  code: string
): Promise<Country | null> {
  try {
    // Fetch full country data without field filter for detail page
    const res = await fetch(
      `${BASE_URL}/alpha/${encodeURIComponent(code)}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // API returns array for alpha endpoint
    return Array.isArray(data) ? data[0] : data;
  } catch {
    return null;
  }
}
