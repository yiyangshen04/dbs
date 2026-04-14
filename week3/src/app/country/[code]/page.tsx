import Link from "next/link";
import { getCountryByCode } from "@/lib/countries";
import { getTravelInfo } from "@/lib/travel-data";
import { getCountryImages } from "@/lib/country-images";
import SaveButton from "@/components/SaveButton";
import HeroImage from "@/components/HeroImage";

const regionColors: Record<string, string> = {
  Africa: "var(--africa)",
  Americas: "var(--americas)",
  Asia: "var(--asia)",
  Europe: "var(--europe)",
  Oceania: "var(--oceania)",
  Antarctic: "var(--antarctic)",
};

const regionGradients: Record<string, string> = {
  Africa: "linear-gradient(135deg, #d4845a 0%, #c9a84c 100%)",
  Americas: "linear-gradient(135deg, #2d5a3d 0%, #3d7a53 100%)",
  Asia: "linear-gradient(135deg, #c9a84c 0%, #dfc47a 100%)",
  Europe: "linear-gradient(135deg, #6a8caa 0%, #8bafc9 100%)",
  Oceania: "linear-gradient(135deg, #6aadcc 0%, #8ec5dd 100%)",
  Antarctic: "linear-gradient(135deg, #94a3b8 0%, #b0bec5 100%)",
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
  const gradient =
    regionGradients[country.region] ||
    "linear-gradient(135deg, #c9a84c 0%, #dfc47a 100%)";
  const travelInfo = getTravelInfo(code);
  const countryImages = getCountryImages(code);
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
      {/* Header with Gradient Banner */}
      <section>
        {/* Hero Banner with Photo */}
        <div
          className="relative overflow-hidden"
          style={{
            background: gradient,
            padding: "2rem 2rem 3rem",
            minHeight: "220px",
          }}
        >
          {countryImages[0] && (
            <HeroImage
              src={countryImages[0]}
              alt={`Scenery of ${country.name.common}`}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 100%)",
            }}
          />
          <div className="mx-auto flex items-end gap-6" style={{ maxWidth: "960px" }}>
            <Link
              href="/explore"
              className="font-heading no-underline absolute top-4 left-6"
              style={{
                fontSize: "0.9rem",
                color: "rgba(255,255,255,0.8)",
                letterSpacing: "0.05em",
              }}
            >
              &larr; Back to Explore
            </Link>

            {/* Flag Badge */}
            <div
              className="shrink-0 rounded-xl overflow-hidden shadow-lg"
              style={{
                width: "120px",
                height: "80px",
                border: "3px solid rgba(255,255,255,0.8)",
              }}
            >
              <img
                src={country.flags.svg}
                alt={country.flags.alt || `Flag of ${country.name.common}`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title */}
            <div className="flex-1 pb-1">
              <h1
                className="font-heading font-bold mb-1"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                  color: "#fff",
                  lineHeight: 1.2,
                  textShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
              >
                {country.name.common}
              </h1>
              <p
                className="font-body italic"
                style={{
                  fontSize: "1rem",
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                {country.name.official}
              </p>
            </div>
          </div>
        </div>

        {/* Save Button Bar */}
        <div
          style={{
            background: "var(--cream)",
            borderBottom: "3px double var(--gold)",
            padding: "1rem 2rem",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: "960px" }}>
            <SaveButton country={country} />
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

      {/* Travel Guide Section */}
      {travelInfo && (
        <>
          {/* Inspirational Banner */}
          <section
            className="relative overflow-hidden text-center"
            style={{
              padding: "3.5rem 2rem",
              background: gradient,
              minHeight: "200px",
            }}
          >
            {countryImages[1] ? (
              <HeroImage src={countryImages[1]} alt={`${country.name.common} scenery`} />
            ) : countryImages[0] ? (
              <HeroImage src={countryImages[0]} alt={`${country.name.common} scenery`} />
            ) : null}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.7) 100%)",
              }}
            />
            <div className="relative z-10">
              <span
                className="block mb-3"
                style={{ fontSize: "1.5rem", color: "var(--gold-light)", letterSpacing: "0.5rem" }}
              >
                &#x2726; &#x2726; &#x2726;
              </span>
              <h2
                className="font-heading font-bold mb-4"
                style={{
                  fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                  color: "#fff",
                  letterSpacing: "0.06em",
                  textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                }}
              >
                Why Visit {country.name.common}?
              </h2>
              <p
                className="font-heading italic mx-auto"
                style={{
                  fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
                  color: "var(--gold-light)",
                  maxWidth: "640px",
                  lineHeight: 1.7,
                  textShadow: "0 1px 6px rgba(0,0,0,0.3)",
                }}
              >
                &ldquo;{travelInfo.tagline}&rdquo;
              </p>
            </div>
          </section>

          <section
            className="mx-auto"
            style={{
              maxWidth: "960px",
              padding: "var(--spacing-lg) var(--spacing-md) var(--spacing-lg)",
            }}
          >
            {/* Highlights — large feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
              {travelInfo.highlights.map((h, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden text-center"
                  style={{
                    background: `linear-gradient(135deg, ${color}18, ${color}08)`,
                    border: `1px solid ${color}33`,
                    borderRadius: "12px",
                    padding: "2rem 1.5rem",
                  }}
                >
                  <div
                    className="mx-auto mb-3 flex items-center justify-center"
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: `${color}20`,
                      fontSize: "1.8rem",
                    }}
                  >
                    {h.icon}
                  </div>
                  <h3
                    className="font-heading font-bold mb-2"
                    style={{ fontSize: "1.15rem", color: "var(--brown)" }}
                  >
                    {h.title}
                  </h3>
                  <p
                    className="font-body"
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--brown-light)",
                      lineHeight: 1.7,
                    }}
                  >
                    {h.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Must-Visit Attractions — numbered list style */}
            <div className="mb-10">
              <h3
                className="font-heading font-bold mb-6 text-center"
                style={{
                  fontSize: "1.4rem",
                  color: "var(--brown)",
                }}
              >
                &#x1F4CD; Must-Visit Attractions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {travelInfo.attractions.map((attraction, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4"
                    style={{
                      background: "var(--cream)",
                      borderRadius: "10px",
                      borderLeft: `4px solid ${color}`,
                    }}
                  >
                    <span
                      className="font-heading font-bold shrink-0 flex items-center justify-center"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: color,
                        color: "#fff",
                        fontSize: "0.9rem",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="font-body font-semibold"
                      style={{ fontSize: "0.95rem", color: "var(--brown)" }}
                    >
                      {attraction}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cuisine + Season + Tip — richer layout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Cuisine */}
              <div
                className="p-6 text-center"
                style={{
                  background: "linear-gradient(135deg, #f5f0e8, #faf8f3)",
                  borderRadius: "12px",
                  border: `1px solid ${color}33`,
                }}
              >
                <div className="text-4xl mb-3">&#x1F37D;&#xFE0F;</div>
                <h4
                  className="font-heading font-bold mb-3"
                  style={{ fontSize: "1.1rem", color: "var(--brown)" }}
                >
                  Taste the Flavors
                </h4>
                <div className="space-y-2">
                  {travelInfo.cuisine.map((dish, i) => (
                    <p
                      key={i}
                      className="font-body"
                      style={{
                        fontSize: "0.92rem",
                        color: "var(--brown-light)",
                        padding: "0.3rem 0",
                        borderBottom: i < travelInfo.cuisine.length - 1 ? "1px dotted var(--gold)" : "none",
                      }}
                    >
                      {dish}
                    </p>
                  ))}
                </div>
              </div>

              {/* Best Season */}
              <div
                className="p-6 text-center"
                style={{
                  background: "linear-gradient(135deg, #f5f0e8, #faf8f3)",
                  borderRadius: "12px",
                  border: "1px solid rgba(201,168,76,0.2)",
                }}
              >
                <div className="text-4xl mb-3">&#x2600;&#xFE0F;</div>
                <h4
                  className="font-heading font-bold mb-3"
                  style={{ fontSize: "1.1rem", color: "var(--brown)" }}
                >
                  When to Go
                </h4>
                <p
                  className="font-body"
                  style={{
                    fontSize: "0.92rem",
                    color: "var(--brown-light)",
                    lineHeight: 1.7,
                  }}
                >
                  {travelInfo.bestSeason}
                </p>
              </div>

              {/* Travel Tip */}
              <div
                className="p-6 text-center"
                style={{
                  background: "linear-gradient(135deg, #f5f0e8, #faf8f3)",
                  borderRadius: "12px",
                  border: "1px solid rgba(45,90,61,0.15)",
                }}
              >
                <div className="text-4xl mb-3">&#x1F4A1;</div>
                <h4
                  className="font-heading font-bold mb-3"
                  style={{ fontSize: "1.1rem", color: "var(--brown)" }}
                >
                  Insider Tip
                </h4>
                <p
                  className="font-body"
                  style={{
                    fontSize: "0.92rem",
                    color: "var(--brown-light)",
                    lineHeight: 1.7,
                  }}
                >
                  {travelInfo.travelTip}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
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
