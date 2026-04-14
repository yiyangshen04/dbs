import Link from "next/link";
import { getCountryByCode } from "@/lib/countries";
import SaveButton from "@/components/SaveButton";

const regionColors: Record<string, string> = {
  Africa: "var(--africa)",
  Americas: "var(--americas)",
  Asia: "var(--asia)",
  Europe: "var(--europe)",
  Oceania: "var(--oceania)",
  Antarctic: "var(--antarctic)",
};

export default async function CountryDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const country = await getCountryByCode(code);

  if (!country) {
    return (
      <div className="text-center py-20">
        <h1
          className="font-heading font-bold mb-4"
          style={{ fontSize: "2rem", color: "var(--brown)" }}
        >
          Country Not Found
        </h1>
        <Link href="/explore" className="pill-btn pill-btn-lg no-underline">
          Back to Explore
        </Link>
      </div>
    );
  }

  const color = regionColors[country.region] || "var(--gold)";
  const languages = country.languages
    ? Object.values(country.languages).join(", ")
    : "N/A";
  const currencies = country.currencies
    ? Object.values(country.currencies)
        .map((c) => `${c.name} (${c.symbol})`)
        .join(", ")
    : "N/A";

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <section
        style={{
          padding: "var(--spacing-md) 2rem",
          background:
            "linear-gradient(180deg, var(--cream) 0%, var(--warm-white) 100%)",
          borderBottom: "3px double var(--gold)",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: "960px" }}>
          <Link
            href="/explore"
            className="font-heading no-underline inline-block mb-4"
            style={{
              fontSize: "0.95rem",
              color: "var(--gold)",
              letterSpacing: "0.05em",
            }}
          >
            &larr; Back to Explore
          </Link>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Flag */}
            <div
              className="w-full md:w-80 shrink-0 rounded-lg overflow-hidden"
              style={{
                border: `3px solid ${color}`,
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
            >
              <img
                src={country.flags.svg}
                alt={
                  country.flags.alt || `Flag of ${country.name.common}`
                }
                className="w-full h-auto"
              />
            </div>

            {/* Title & Save */}
            <div className="flex-1">
              <h1
                className="font-heading font-bold mb-1"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                  color,
                  lineHeight: 1.2,
                }}
              >
                {country.name.common}
              </h1>
              <p
                className="font-body italic mb-4"
                style={{
                  fontSize: "1rem",
                  color: "var(--brown-light)",
                }}
              >
                {country.name.official}
              </p>

              <SaveButton country={country} />
            </div>
          </div>
        </div>
      </section>

      {/* Key Facts */}
      <section
        className="mx-auto"
        style={{
          maxWidth: "960px",
          padding: "var(--spacing-lg) var(--spacing-md)",
        }}
      >
        <div
          className="card-ornament p-6"
          style={{
            background: "var(--cream)",
            border: "2px solid var(--gold)",
            borderRadius: "6px",
          }}
        >
          <h2
            className="font-heading font-semibold mb-4 text-center uppercase"
            style={{
              fontSize: "1.3rem",
              color: "var(--green)",
              letterSpacing: "0.08em",
            }}
          >
            Key Facts
          </h2>
          <div className="ornament-line mb-6" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <Fact label="Capital" value={country.capital?.[0] || "N/A"} />
            <Fact label="Region" value={`${country.region}${country.subregion ? ` / ${country.subregion}` : ""}`} />
            <Fact label="Population" value={country.population.toLocaleString()} />
            <Fact label="Area" value={country.area ? `${country.area.toLocaleString()} km\u00B2` : "N/A"} />
            <Fact label="Languages" value={languages} />
            <Fact label="Currencies" value={currencies} />
            <Fact label="Timezones" value={country.timezones?.join(", ") || "N/A"} />
            <Fact label="Continents" value={country.continents?.join(", ") || "N/A"} />
          </div>

          {/* Map Link */}
          {country.maps?.googleMaps && (
            <div className="text-center mt-6">
              <a
                href={country.maps.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="pill-btn pill-btn-lg no-underline"
              >
                View on Google Maps &rarr;
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2" style={{ fontSize: "0.95rem" }}>
      <span
        className="font-body font-semibold shrink-0"
        style={{ color: "var(--green)", minWidth: "100px" }}
      >
        {label}:
      </span>
      <span className="font-body" style={{ color: "var(--brown)" }}>
        {value}
      </span>
    </div>
  );
}
