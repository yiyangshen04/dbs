"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
    <div className="flex h-full w-full items-center justify-center text-sm text-muted">
      Loading map…
    </div>
  ),
});

type ConnStatus = "connecting" | "live" | "reconnecting";

// Full snapshot every 2 minutes reconciles anything a dropped WebSocket
// frame missed (Realtime doesn't replay).
const RECONCILE_MS = 2 * 60 * 1000;
const FLUSH_MS = 150;

export default function HomePage() {
  const [flights, setFlights] = useState<Map<string, Flight>>(new Map());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<Observation[] | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [lastSyncMs, setLastSyncMs] = useState<number | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const { favorites, callsignSet, add, remove, signedIn } = useFavorites();

  // Reconcile with a full snapshot. Merge by row recency rather than blind
  // replace — realtime events that landed while the snapshot request was in
  // flight are newer than the snapshot's rows, and blindly replacing would
  // resurrect pruned planes or snap fresh positions backwards.
  const refetchSnapshot = useCallback(async () => {
    try {
      const r = await fetch("/api/flights");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { flights: Flight[] };
      if (data.flights.length === 0) {
        // Table is genuinely empty (ingest stopped >10 min ago).
        setFlights(new Map());
        setLastSyncMs(Date.now());
        return;
      }
      let snapshotHighWater = 0;
      for (const f of data.flights) {
        const t = Date.parse(f.updated_at);
        if (t > snapshotHighWater) snapshotHighWater = t;
      }
      setFlights((prev) => {
        const next = new Map<string, Flight>();
        for (const f of data.flights) {
          const cur = prev.get(f.icao24);
          next.set(
            f.icao24,
            cur && Date.parse(cur.updated_at) > Date.parse(f.updated_at)
              ? cur
              : f,
          );
        }
        // Rows we hold that the snapshot lacks: keep only ones written
        // around/after the snapshot (added mid-flight); the rest were
        // pruned server-side and must not resurrect.
        for (const [icao, cur] of prev) {
          if (!next.has(icao) && Date.parse(cur.updated_at) >= snapshotHighWater - 90_000) {
            next.set(icao, cur);
          }
        }
        return next;
      });
      setLastSyncMs(Date.now());
    } catch (e) {
      console.warn("[snapshot] refetch failed:", e);
    }
  }, []);

  // Realtime subscription with coalesced flush and automatic reconnect.
  // Worker writes arrive in bursts (hundreds of postgres_changes events per
  // sweep); applying each one would re-render per event, so changes buffer
  // in refs and flush into state every 150 ms.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    let disposed = false;
    let generation = 0;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let activeChannel: RealtimeChannel | null = null;

    const pendingUpserts = new Map<string, Flight>();
    const pendingDeletes = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      flushTimer = null;
      if (pendingUpserts.size === 0 && pendingDeletes.size === 0) return;
      // Copy before dispatching: React may run the updater later (or twice
      // in StrictMode), and the pending buffers are cleared synchronously
      // below — an updater closing over the live buffers would see them
      // empty and silently drop the whole batch.
      const upserts = new Map(pendingUpserts);
      const deletes = new Set(pendingDeletes);
      pendingUpserts.clear();
      pendingDeletes.clear();
      setFlights((prev) => {
        const next = new Map(prev);
        for (const icao of deletes) next.delete(icao);
        for (const [icao, row] of upserts) next.set(icao, row);
        return next;
      });
      setLastSyncMs(Date.now());
    };
    const schedule = () => {
      if (flushTimer == null) flushTimer = setTimeout(flush, FLUSH_MS);
    };

    const connect = () => {
      if (disposed) return;
      const myGen = ++generation;
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
          if (disposed || myGen !== generation) return;
          if (state === "SUBSCRIBED") {
            attempt = 0;
            setStatus("live");
            // Catch up on whatever changed while we weren't listening.
            void refetchSnapshot();
          }
          if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
            // Supersede this channel FIRST: removeChannel() synchronously
            // re-invokes this same callback with CLOSED, and without the
            // generation bump that re-entry would recurse forever.
            generation += 1;
            activeChannel = null;
            setStatus("reconnecting");
            void supabase.removeChannel(channel);
            attempt += 1;
            const backoff = Math.min(30_000, 2_000 * 2 ** Math.min(attempt, 4));
            retryTimer = setTimeout(connect, backoff);
          }
        });
      activeChannel = channel;
    };

    connect();

    const reconcile = setInterval(() => {
      if (document.visibilityState === "visible") void refetchSnapshot();
    }, RECONCILE_MS);

    return () => {
      disposed = true;
      generation += 1;
      if (retryTimer != null) clearTimeout(retryTimer);
      if (flushTimer != null) clearTimeout(flushTimer);
      clearInterval(reconcile);
      // Remove only OUR channel — removeAllChannels() would tear down the
      // socket a remounted effect (StrictMode) is subscribing on.
      if (activeChannel) void supabase.removeChannel(activeChannel);
    };
  }, [refetchSnapshot]);

  const flightList = useMemo(() => {
    const all = [...flights.values()];
    const q = query.trim().toUpperCase();
    const matched = q
      ? all.filter((f) => {
          const cs = (f.callsign ?? "").toUpperCase();
          const country = (f.origin_country ?? "").toUpperCase();
          return (
            cs.includes(q) ||
            f.icao24.toUpperCase().includes(q) ||
            country.includes(q)
          );
        })
      : all;
    // Airborne traffic first, then alphabetical — parked GA with odd
    // callsigns shouldn't crowd the top of the list.
    return matched.sort(
      (a, b) =>
        Number(a.on_ground) - Number(b.on_ground) ||
        (a.callsign ?? `~${a.icao24}`).localeCompare(b.callsign ?? `~${b.icao24}`),
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

  const airborne = useMemo(
    () => [...flights.values()].filter((f) => !f.on_ground).length,
    [flights],
  );

  return (
    <main className="grid h-screen grid-cols-[330px_1fr_360px] grid-rows-[auto_1fr] bg-background">
      <header className="col-span-3 flex items-center justify-between border-b border-panel-border bg-panel/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <PlaneLogo />
          <div>
            <h1 className="text-[15px] font-semibold uppercase tracking-[0.18em]">
              US Airspace Monitor
            </h1>
            <p className="text-[11px] text-muted">
              Nationwide ADS-B coverage · CONUS + Alaska + Hawaii
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <HeaderKpi label="Tracked" value={flights.size} />
          <HeaderKpi label="Airborne" value={airborne} />
          <StatusChip status={status} lastSyncMs={lastSyncMs} />
          <AuthHeader />
        </div>
      </header>

      <aside className="flex min-h-0 flex-col overflow-hidden border-r border-panel-border bg-panel">
        <div className="border-b border-panel-border p-3">
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
          <div className="border-t border-panel-border p-3">
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
              My favorites
            </h2>
            <FavoritesPanel
              favorites={favorites}
              flights={flights}
              onSelect={handleSelect}
            />
          </div>
        ) : null}
        <div className="border-t border-panel-border p-3">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
            Statistics
          </h2>
          <StatsDashboard flights={[...flights.values()]} />
        </div>
      </aside>

      <section className="relative min-h-0 bg-background">
        <FlightMap
          flights={flightList}
          selectedIcao={selected}
          onSelect={handleSelect}
          history={selectedHistory ?? undefined}
        />
      </section>

      <aside className="min-h-0 overflow-hidden border-l border-panel-border bg-panel">
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
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="text-2xl opacity-40">✈</span>
            <p className="text-sm text-muted">
              Select an aircraft on the map or in the list
              <br />
              to see live details and its recent track.
            </p>
          </div>
        )}
      </aside>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </main>
  );
}

function PlaneLogo() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-panel-border bg-background">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 1.5c.6 0 1.1 1 1.3 2.2l.5 5.1 7.6 4.4c.4.2.6.6.6 1v1.3l-8-2.3-.4 4.9 2.3 1.7c.2.15.3.4.3.6v1l-3.6-.9-.6 1.4-.6-1.4-3.6.9v-1c0-.25.1-.5.3-.6l2.3-1.7-.4-4.9-8 2.3v-1.3c0-.4.2-.8.6-1l7.6-4.4.5-5.1C10.9 2.5 11.4 1.5 12 1.5z"
          fill="#22d3ee"
        />
      </svg>
    </div>
  );
}

function HeaderKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="hidden text-right sm:block">
      <div className="font-mono text-sm leading-tight">{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}

function StatusChip({
  status,
  lastSyncMs,
}: {
  status: ConnStatus;
  lastSyncMs: number | null;
}) {
  const cfg =
    status === "live"
      ? { color: "bg-accent", text: "LIVE", cls: "text-accent" }
      : status === "reconnecting"
        ? { color: "bg-amber-400", text: "RECONNECTING", cls: "text-amber-400" }
        : { color: "bg-amber-400", text: "CONNECTING", cls: "text-amber-400" };
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-panel-border px-3 py-1"
      title={
        lastSyncMs
          ? `Last update ${new Date(lastSyncMs).toLocaleTimeString()}`
          : undefined
      }
    >
      <span className={`live-dot inline-block h-2 w-2 rounded-full ${cfg.color}`} />
      <span className={`text-[10px] font-semibold tracking-[0.15em] ${cfg.cls}`}>
        {cfg.text}
      </span>
    </div>
  );
}
