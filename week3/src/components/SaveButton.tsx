"use client";

import { useState, useEffect } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { Country } from "@/lib/types";

export default function SaveButton({ country }: { country: Country }) {
  const { isSignedIn } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/saved")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSaved(data.some((s) => s.country_code === country.cca3));
        }
      })
      .catch(() => {});
  }, [isSignedIn, country.cca3]);

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="pill-btn pill-btn-lg">
          Sign in to save
        </button>
      </SignInButton>
    );
  }

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (saved) {
        await fetch(`/api/saved?country_code=${country.cca3}`, {
          method: "DELETE",
        });
        setSaved(false);
      } else {
        await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country_code: country.cca3,
            country_name: country.name.common,
            flag_url: country.flags.svg,
            region: country.region,
          }),
        });
        setSaved(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="pill-btn pill-btn-lg"
      style={
        saved
          ? {
              background: "var(--gold)",
              color: "var(--warm-white)",
              borderColor: "var(--gold)",
            }
          : {}
      }
    >
      {loading ? "..." : saved ? "\u2726 Saved to Bucket List" : "\u2726 Save to Bucket List"}
    </button>
  );
}
