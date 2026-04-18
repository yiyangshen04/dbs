"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  resultCount: number;
}

export default function SearchBar({ value, onChange, resultCount }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search callsign (e.g. UAL, DAL, JBU)…"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm
                   outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500
                   dark:border-slate-700 dark:bg-slate-900"
        spellCheck={false}
        autoCorrect="off"
      />
      <div className="text-xs text-slate-500">
        {value ? `${resultCount} match${resultCount === 1 ? "" : "es"}` : `${resultCount} flights`}
      </div>
    </div>
  );
}
