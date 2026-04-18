"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Flight, Observation } from "@/lib/types";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useFavorites } from "@/lib/use-favorites";
import SearchBar from "@/components/SearchBar";
import FlightList from "@/components/FlightList";
import FlightDetailPanel from "@/components/FlightDetailPanel";
import StatsDashboard from "@/components/StatsDashboard";
import FavoritesPanel from "@/components/FavoritesPanel";
import FavoriteButton from "@/components/FavoriteButton";
import AuthHeader from "@/components/AuthHeader";
import SignInModal from "@/components/SignInModal";

// Leaflet touches `window` at import time — must be client-only.
const FlightMap = dynamic(() => import("@/components/FlightMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
      Loading map…
    </div>
  ),
});

export default function HomePage() {
  const [flights, setFlights] = useState<Map<string, Flight>>(new Map());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<Observation[] | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const { favorites, callsignSet, add, remove, signedIn } = useFavorites();

  // Initial snapshot.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/flights")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { flights: Flight[] }) => {
        if (cancelled) return;
        const m = new Map<string, Flight>();
        for (const f of data.flights) m.set(f.icao24, f);
        setFlights(m);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setErrorMsg(e.message);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime subscription with coalesced flush.
  // During worker poll bursts we receive up to 50 postgres_changes events
  // per second. Applying each one to React state would trigger a re-render
  // per event — expensive with ~5 k markers. Instead we accumulate
  // upserts/deletes in a ref and flush them into state every 150 ms.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    const pendingUpserts = new Map<string, Flight>();
    const pendingDeletes = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      flushTimer = null;
      if (pendingUpserts.size === 0 && pendingDeletes.size === 0) return;
      setFlights((prev) => {
        const next = new Map(prev);
        for (const icao of pendingDeletes) next.delete(icao);
        for (const [icao, row] of pendingUpserts) next.set(icao, row);
        return next;
      });
      pendingUpserts.clear();
      pendingDeletes.clear();
    };

    const schedule = () => {
      if (flushTimer == null) flushTimer = setTimeout(flush, 150);
    };

    const channel = supabase
      .channel("flights_current")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "flights_current" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { icao24?: string };
            if (old.icao24) {
              pendingUpserts.delete(old.icao24);
              pendingDeletes.add(old.icao24);
            }
          } else {
            const row = payload.new as Flight;
            if (row?.icao24) {
              pendingDeletes.delete(row.icao24);
              pendingUpserts.set(row.icao24, row);
            }
          }
          schedule();
        },
      )
      .subscribe((state) => {
        if (state === "SUBSCRIBED") setStatus("live");
        if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
          setStatus("error");
          setErrorMsg("Realtime connection lost");
        }
      });

    return () => {
      if (flushTimer != null) clearTimeout(flushTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const flightList = useMemo(() => {
    const all = [...flights.values()];
    const q = query.trim().toUpperCase();
    if (!q) {
      return all.sort((a, b) =>
        (a.callsign ?? a.icao24).localeCompare(b.callsign ?? b.icao24),
      );
    }
    return all
      .filter((f) => {
        const cs = (f.callsign ?? "").toUpperCase();
        return cs.includes(q) || f.icao24.toUpperCase().includes(q);
      })
      .sort((a, b) =>
        (a.callsign ?? a.icao24).localeCompare(b.callsign ?? b.icao24),
      );
  }, [flights, query]);

  const handleSelect = useCallback((icao24: string) => {
    setSelected(icao24);
    setSelectedHistory(null);
  }, []);
  const handleHistoryLoaded = useCallback((obs: Observation[]) => {
    setSelectedHistory(obs);
  }, []);
  const selectedFlight = selected ? flights.get(selected) ?? null : null;

  return (
    <main className="grid h-screen grid-cols-[320px_1fr_340px] grid-rows-[auto_1fr] bg-slate-100 dark:bg-slate-950">
      <header className="col-span-3 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-lg font-semibold tracking-tight">
          Flight Tracker{" "}
          <span className="text-sm font-normal text-slate-500">
            · live US airspace
          </span>
        </h1>
        <div className="flex items-center gap-4">
          <StatusChip status={status} errorMsg={errorMsg} />
          <AuthHeader />
        </div>
      </header>

      <aside className="flex min-h-0 flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-3 dark:border-slate-800">
          <SearchBar
            value={query}
            onChange={setQuery}
            resultCount={flightList.length}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <FlightList
            flights={flightList}
            selectedIcao={selected}
            onSelect={handleSelect}
          />
        </div>
        {signedIn ? (
          <div className="border-t border-slate-200 p-3 dark:border-slate-800">
            <h2 className="mb-2 text-xs uppercase tracking-wider text-slate-500">
              My favorites
            </h2>
            <FavoritesPanel
              favorites={favorites}
              flights={flights}
              onSelect={handleSelect}
            />
          </div>
        ) : null}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <h2 className="mb-2 text-xs uppercase tracking-wider text-slate-500">
            Live stats
          </h2>
          <StatsDashboard flights={[...flights.values()]} />
        </div>
      </aside>

      <section className="relative min-h-0 bg-slate-200 dark:bg-slate-900">
        <FlightMap
          flights={flightList}
          selectedIcao={selected}
          onSelect={handleSelect}
          history={selectedHistory ?? undefined}
        />
      </section>

      <aside className="min-h-0 overflow-hidden bg-white dark:bg-slate-950">
        {selectedFlight ? (
          <FlightDetailPanel
            key={selectedFlight.icao24}
            flight={selectedFlight}
            onClose={() => setSelected(null)}
            onHistoryLoaded={handleHistoryLoaded}
            favoriteControl={
              <FavoriteButton
                callsign={selectedFlight.callsign?.trim() || null}
                isFavorite={
                  !!selectedFlight.callsign &&
                  callsignSet.has(selectedFlight.callsign.trim())
                }
                signedIn={signedIn}
                onRequireSignIn={() => setSignInOpen(true)}
                onToggle={() => {
                  const cs = selectedFlight.callsign?.trim();
                  if (!cs) return;
                  if (callsignSet.has(cs)) remove(cs);
                  else add(cs);
                }}
              />
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
            Click a plane on the map or in the list to see details.
          </div>
        )}
      </aside>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </main>
  );
}

function StatusChip({
  status,
  errorMsg,
}: {
  status: "loading" | "live" | "error";
  errorMsg: string | null;
}) {
  const color =
    status === "live"
      ? "bg-emerald-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-amber-400";
  const label =
    status === "live"
      ? "Live"
      : status === "error"
        ? `Error: ${errorMsg ?? "unknown"}`
        : "Connecting…";
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
      <span className={`inline-block h-2 w-2 rounded-full ${color} animate-pulse`} />
      {label}
    </div>
  );
}
