"use client";

import { useState, useEffect, useMemo } from "react";
import CountryCard from "@/components/CountryCard";
import RegionFilter from "@/components/RegionFilter";
import { Country } from "@/lib/types";

export default function ExplorePage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");

  // Fetch all countries once on mount
  useEffect(() => {
    fetch("/api/countries")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCountries(data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Client-side filter
  const filtered = useMemo(() => {
    let result = countries;
    if (region) {
      result = result.filter((c) => c.region === region);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.common.toLowerCase().includes(q) ||
          c.name.official.toLowerCase().includes(q) ||
          (c.capital && c.capital.some((cap) => cap.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [countries, region, search]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <section
        className="text-center"
        style={{
          padding: "var(--spacing-lg) 2rem var(--spacing-md)",
          background:
            "linear-gradient(180deg, var(--cream) 0%, var(--warm-white) 100%)",
          borderBottom: "3px double var(--gold)",
        }}
      >
        <span
          className="block mb-2"
          style={{
            fontSize: "1.2rem",
            color: "var(--gold)",
            letterSpacing: "0.4rem",
          }}
        >
          &#x2726;
        </span>
        <h1
          className="shimmer-text font-heading font-bold mb-2"
          style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", lineHeight: 1.2 }}
        >
          Explore Countries
        </h1>
        <p
          className="font-heading italic"
          style={{ fontSize: "1.1rem", color: "var(--gold)" }}
        >
          {countries.length} countries worldwide
        </p>
      </section>

      {/* Search & Filter */}
      <section
        className="mx-auto"
        style={{
          maxWidth: "960px",
          padding: "var(--spacing-md) var(--spacing-md) 0",
        }}
      >
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by country name or capital..."
            className="w-full font-body px-4 py-3 rounded-full border-2 border-gold bg-warm-white text-brown outline-none"
            style={{
              fontSize: "0.95rem",
              transition: "box-shadow var(--transition-base)",
            }}
          />
        </div>

        {/* Region Filter */}
        <RegionFilter selected={region} onSelect={setRegion} />
      </section>

      {/* Results */}
      <section
        className="mx-auto"
        style={{
          maxWidth: "960px",
          padding: "var(--spacing-md)",
        }}
      >
        {loading ? (
          <div className="text-center py-16">
            <p
              className="font-heading"
              style={{ fontSize: "1.2rem", color: "var(--gold)" }}
            >
              Loading countries...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p
              className="font-heading"
              style={{ fontSize: "1.2rem", color: "var(--brown-light)" }}
            >
              No countries found.
            </p>
          </div>
        ) : (
          <>
            <p
              className="text-center font-body mb-4"
              style={{
                fontSize: "0.85rem",
                color: "var(--brown-light)",
              }}
            >
              Showing {filtered.length} countr{filtered.length === 1 ? "y" : "ies"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((country) => (
                <CountryCard key={country.cca3} country={country} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
