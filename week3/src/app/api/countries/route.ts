import { NextRequest } from "next/server";
import {
  getAllCountries,
  searchCountries,
  getCountriesByRegion,
} from "@/lib/countries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const region = searchParams.get("region");

  try {
    let countries;
    if (search) {
      countries = await searchCountries(search);
    } else if (region) {
      countries = await getCountriesByRegion(region);
    } else {
      countries = await getAllCountries();
    }

    const sorted = countries.sort((a, b) =>
      a.name.common.localeCompare(b.name.common)
    );

    return Response.json(sorted);
  } catch {
    return Response.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}
