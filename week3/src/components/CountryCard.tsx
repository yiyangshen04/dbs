import Link from "next/link";
import { Country } from "@/lib/types";

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

  return (
    <Link
      href={`/country/${country.cca3}`}
      className="card-ornament block p-4 no-underline transition-all hover:-translate-y-1"
      style={{
        background: "var(--cream)",
        borderTop: `3px solid ${color}`,
        transition: "transform var(--transition-base), box-shadow var(--transition-base)",
      }}
    >
      {/* Flag */}
      <div
        className="w-full h-36 rounded-lg overflow-hidden mb-3"
        style={{ border: `2px solid ${color}` }}
      >
        <img
          src={country.flags.svg}
          alt={country.flags.alt || `Flag of ${country.name.common}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Name */}
      <h3
        className="font-heading font-bold mb-1"
        style={{ fontSize: "1.15rem", color }}
      >
        {country.name.common}
      </h3>

      {/* Details */}
      <div
        className="font-body space-y-0.5"
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
        </p>
        <p>
          <span style={{ color: "var(--green)" }}>Population:</span>{" "}
          {formatPopulation(country.population)}
        </p>
      </div>
    </Link>
  );
}
