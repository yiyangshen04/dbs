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

const regionGradients: Record<string, string> = {
  Africa: "linear-gradient(135deg, #d4845a 0%, #c9a84c 100%)",
  Americas: "linear-gradient(135deg, #2d5a3d 0%, #3d7a53 100%)",
  Asia: "linear-gradient(135deg, #c9a84c 0%, #dfc47a 100%)",
  Europe: "linear-gradient(135deg, #6a8caa 0%, #8bafc9 100%)",
  Oceania: "linear-gradient(135deg, #6aadcc 0%, #8ec5dd 100%)",
  Antarctic: "linear-gradient(135deg, #94a3b8 0%, #b0bec5 100%)",
};

const regionIcons: Record<string, string> = {
  Africa: "\uD83E\uDD81",
  Americas: "\uD83C\uDF0E",
  Asia: "\u26E9\uFE0F",
  Europe: "\uD83C\uDFF0",
  Oceania: "\uD83C\uDFDD\uFE0F",
  Antarctic: "\u2744\uFE0F",
};

function formatPopulation(pop: number): string {
  if (pop >= 1_000_000_000) return (pop / 1_000_000_000).toFixed(1) + "B";
  if (pop >= 1_000_000) return (pop / 1_000_000).toFixed(1) + "M";
  if (pop >= 1_000) return (pop / 1_000).toFixed(1) + "K";
  return pop.toString();
}

export default function CountryCard({ country }: { country: Country }) {
  const color = regionColors[country.region] || "var(--gold)";
  const gradient =
    regionGradients[country.region] ||
    "linear-gradient(135deg, #c9a84c 0%, #dfc47a 100%)";
  const regionIcon = regionIcons[country.region] || "\uD83C\uDF0D";

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
      {/* Gradient Banner with Region Icon */}
      <div
        className="relative flex items-center justify-center"
        style={{
          background: gradient,
          height: "120px",
        }}
      >
        {/* Region icon watermark */}
        <span
          className="absolute opacity-20"
          style={{ fontSize: "4rem" }}
        >
          {regionIcon}
        </span>

        {/* Flag badge */}
        <div
          className="absolute top-3 left-3 rounded-full overflow-hidden shadow-md"
          style={{
            width: "40px",
            height: "40px",
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
          className="relative font-heading font-bold text-center px-4"
          style={{
            fontSize: "1.25rem",
            color: "#fff",
            textShadow: "0 2px 8px rgba(0,0,0,0.3)",
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
