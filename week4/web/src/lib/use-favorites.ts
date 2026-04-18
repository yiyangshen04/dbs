"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase-browser";
import { useAuth } from "./use-auth";

export interface Favorite {
  id: string;
  callsign: string;
  note: string | null;
  created_at: string;
}

// Tracks the user's saved favorites. Loads on session change.
// Returns add/remove helpers and a constant-time lookup Set.
export function useFavorites() {
  const { session } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const supabase = getBrowserSupabase();
    supabase
      .from("user_favorites")
      .select("id, callsign, note, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setFavorites(data);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const add = useCallback(
    async (callsign: string, note?: string) => {
      if (!session) return;
      const supabase = getBrowserSupabase();
      const trimmed = callsign.trim();
      if (!trimmed) return;
      const { data, error } = await supabase
        .from("user_favorites")
        .insert({ user_id: session.user.id, callsign: trimmed, note: note ?? null })
        .select("id, callsign, note, created_at")
        .single();
      if (!error && data) {
        setFavorites((prev) => [data, ...prev]);
      }
    },
    [session],
  );

  const remove = useCallback(
    async (callsign: string) => {
      if (!session) return;
      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", session.user.id)
        .eq("callsign", callsign.trim());
      if (!error) {
        setFavorites((prev) => prev.filter((f) => f.callsign !== callsign.trim()));
      }
    },
    [session],
  );

  // Derive "effective" favorites. When the session is gone we hide stale state
  // instead of clearing it inside an effect (the React 19 lint rule forbids
  // synchronous setState in effects).
  const effective = session ? favorites : [];
  const callsignSet = new Set(effective.map((f) => f.callsign));

  return {
    favorites: effective,
    callsignSet,
    add,
    remove,
    signedIn: !!session,
  };
}
