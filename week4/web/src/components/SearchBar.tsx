"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  resultCount: number;
}

export default function SearchBar({ value, onChange, resultCount }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Callsign, hex or country…"
          className="w-full rounded-lg border border-panel-border bg-background py-2 pl-8 pr-3 font-mono text-sm
                     outline-none transition placeholder:font-sans placeholder:text-muted/70
                     focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
          spellCheck={false}
          autoCorrect="off"
        />
      </div>
      <div className="text-[11px] text-muted">
        {value
          ? `${resultCount.toLocaleString()} match${resultCount === 1 ? "" : "es"}`
          : `${resultCount.toLocaleString()} aircraft tracked`}
      </div>
    </div>
  );
}
