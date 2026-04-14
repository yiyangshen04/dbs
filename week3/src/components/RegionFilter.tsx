"use client";

const REGIONS = [
  { name: "All", color: "var(--gold)" },
  { name: "Africa", color: "var(--africa)" },
  { name: "Americas", color: "var(--americas)" },
  { name: "Asia", color: "var(--asia)" },
  { name: "Europe", color: "var(--europe)" },
  { name: "Oceania", color: "var(--oceania)" },
];

interface RegionFilterProps {
  selected: string;
  onSelect: (region: string) => void;
}

export default function RegionFilter({
  selected,
  onSelect,
}: RegionFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {REGIONS.map((region) => {
        const isActive =
          selected === region.name || (selected === "" && region.name === "All");
        return (
          <button
            key={region.name}
            onClick={() => onSelect(region.name === "All" ? "" : region.name)}
            className="pill-btn text-sm"
            style={
              isActive
                ? {
                    background: region.color,
                    color: "var(--warm-white)",
                    borderColor: region.color,
                  }
                : { borderColor: region.color }
            }
          >
            {region.name}
          </button>
        );
      })}
    </div>
  );
}
