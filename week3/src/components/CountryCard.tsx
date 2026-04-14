import Link from "next/link";
import { Country } from "@/lib/types";
import { getCountryImages } from "@/lib/country-images";

const regionColors: Record<string, string> = {
  Africa: "var(--africa)",
  Americas: "var(--americas)",
  Asia: "var(--asia)",
  Europe: "var(--europe)",
  Oceania: "var(--oceania)",
  Antarctic: "var(--antarctic)",
};

function formatPopulation(pop: number): string {
  if (pop >= 1_000_000_000) return (pop / 1_000_000_000).toFixed(1) + "B";
  if (pop >= 1_000_000) return (pop / 1_000_000).toFixed(1) + "M";
  if (pop >= 1_000) return (pop / 1_000).toFixed(1) + "K";
  return pop.toString();
}

export default function CountryCard({ country }: { country: Country }) {
  const color = regionColors[country.region] || "var(--gold)";
  const images = getCountryImages(country.cca3);
  const heroImage = images[0];

  return (
    <Link
      href={`/country/${country.cca3}`}
      className="card-ornament block no-underline transition-all hover:-translate-y-2 overflow-hidden"
      style={{
        background: "var(--cream)",
        borderTop: `3px solid ${color}`,
        transition:
          "transform var(--transition-base), box-shadow var(--transition-base)",
      }}
    >
      {/* Image Banner */}
      <div
        className="relative flex items-end justify-start"
        style={{ height: "140px", overflow: "hidden" }}
      >
        {heroImage ? (
          <img
            src={heroImage}
            alt={`Scenery of ${country.name.common}`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${color}88, ${color}44)`,
            }}
          />
        )}

        {/* Gradient overlay for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
          }}
        />

        {/* Flag badge */}
        <div
          className="absolute top-3 left-3 rounded-full overflow-hidden shadow-md"
          style={{
            width: "36px",
            height: "36px",
            border: "2px solid rgba(255,255,255,0.8)",
          }}
        >
          <img
            src={country.flags.svg}
            alt={country.flags.alt || `Flag of ${country.name.common}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Country name overlay */}
        <h3
          className="relative font-heading font-bold px-4 pb-3"
          style={{
            fontSize: "1.2rem",
            color: "#fff",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
            lineHeight: 1.3,
          }}
        >
          {country.name.common}
        </h3>
      </div>

      {/* Details */}
      <div className="p-4">
        <div
          className="font-body space-y-1"
          style={{ fontSize: "0.85rem", color: "var(--brown-light)" }}
        >
          {country.capital?.[0] && (
            <p>
              <span style={{ color: "var(--green)" }}>Capital:</span>{" "}
              {country.capital[0]}
            </p>
          )}
          <p>
            <span style={{ color: "var(--green)" }}>Region:</span>{" "}
            {country.region}
            {country.subregion ? ` / ${country.subregion}` : ""}
          </p>
          <p>
            <span style={{ color: "var(--green)" }}>Population:</span>{" "}
            {formatPopulation(country.population)}
          </p>
        </div>
      </div>
    </Link>
  );
}
