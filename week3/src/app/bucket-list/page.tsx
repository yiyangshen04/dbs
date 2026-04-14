"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SavedCountry } from "@/lib/types";

type Filter = "all" | "visited" | "want";

export default function BucketListPage() {
  const [items, setItems] = useState<SavedCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const fetchItems = () => {
    fetch("/api/saved")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "visited") return items.filter((i) => i.visited);
    if (filter === "want") return items.filter((i) => !i.visited);
    return items;
  }, [items, filter]);

  const stats = useMemo(() => {
    const total = items.length;
    const visited = items.filter((i) => i.visited).length;
    return { total, visited, remaining: total - visited };
  }, [items]);

  const toggleVisited = async (item: SavedCountry) => {
    const res = await fetch("/api/saved", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country_code: item.country_code,
        visited: !item.visited,
      }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) =>
          i.country_code === item.country_code
            ? { ...i, visited: !i.visited }
            : i
        )
      );
    }
  };

  const saveNotes = async (countryCode: string) => {
    const res = await fetch("/api/saved", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country_code: countryCode,
        notes: noteText,
      }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) =>
          i.country_code === countryCode ? { ...i, notes: noteText } : i
        )
      );
      setEditingNotes(null);
    }
  };

  const removeItem = async (countryCode: string) => {
    const res = await fetch(`/api/saved?country_code=${countryCode}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.country_code !== countryCode));
    }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "visited", label: "Visited" },
    { key: "want", label: "Want to Visit" },
  ];

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
          My Bucket List
        </h1>
      </section>

      <section
        className="mx-auto"
        style={{
          maxWidth: "960px",
          padding: "var(--spacing-md)",
        }}
      >
        {/* Stats */}
        {!loading && items.length > 0 && (
          <div
            className="card-ornament p-4 mb-6 text-center"
            style={{
              background: "var(--cream)",
              border: "2px solid var(--gold)",
              borderRadius: "6px",
            }}
          >
            <div className="flex justify-center gap-8 flex-wrap">
              <StatItem label="Saved" value={stats.total} />
              <StatItem label="Visited" value={stats.visited} />
              <StatItem label="Remaining" value={stats.remaining} />
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 justify-center mb-6">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`pill-btn text-sm ${filter === f.key ? "pill-btn-active" : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <p
            className="text-center font-heading py-16"
            style={{ fontSize: "1.2rem", color: "var(--gold)" }}
          >
            Loading...
          </p>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p
              className="font-heading mb-4"
              style={{ fontSize: "1.2rem", color: "var(--brown-light)" }}
            >
              Your bucket list is empty.
            </p>
            <Link
              href="/explore"
              className="pill-btn pill-btn-lg no-underline"
            >
              Start Exploring
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p
            className="text-center font-heading py-16"
            style={{ fontSize: "1.1rem", color: "var(--brown-light)" }}
          >
            No countries match this filter.
          </p>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <div
                key={item.country_code}
                className="card-ornament p-4 flex flex-col sm:flex-row gap-4 items-start"
                style={{
                  background: "var(--cream)",
                  borderLeft: `4px solid ${item.visited ? "var(--green)" : "var(--gold)"}`,
                }}
              >
                {/* Flag */}
                <Link
                  href={`/country/${item.country_code}`}
                  className="shrink-0"
                >
                  <img
                    src={item.flag_url}
                    alt={item.country_name}
                    className="w-20 h-14 object-cover rounded"
                    style={{ border: "1px solid var(--gold)" }}
                  />
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <Link
                      href={`/country/${item.country_code}`}
                      className="font-heading font-bold no-underline"
                      style={{ fontSize: "1.1rem", color: "var(--brown)" }}
                    >
                      {item.country_name}
                    </Link>
                    <span
                      className="font-body text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: item.visited
                          ? "var(--green)"
                          : "var(--gold-light)",
                        color: item.visited
                          ? "var(--warm-white)"
                          : "var(--brown)",
                        fontSize: "0.75rem",
                      }}
                    >
                      {item.visited ? "Visited" : "Want to Visit"}
                    </span>
                  </div>
                  <p
                    className="font-body"
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--brown-light)",
                    }}
                  >
                    {item.region}
                  </p>

                  {/* Notes */}
                  {editingNotes === item.country_code ? (
                    <div className="mt-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full p-2 rounded border border-gold bg-warm-white font-body text-sm text-brown"
                        rows={2}
                        placeholder="Add your travel notes..."
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => saveNotes(item.country_code)}
                          className="pill-btn text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNotes(null)}
                          className="pill-btn text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : item.notes ? (
                    <p
                      className="font-body italic mt-1 cursor-pointer"
                      onClick={() => {
                        setEditingNotes(item.country_code);
                        setNoteText(item.notes || "");
                      }}
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--brown-light)",
                      }}
                    >
                      &ldquo;{item.notes}&rdquo;
                    </p>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => toggleVisited(item)}
                    className="pill-btn text-xs"
                    title={
                      item.visited ? "Mark as not visited" : "Mark as visited"
                    }
                  >
                    {item.visited ? "Unvisit" : "Visited"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(item.country_code);
                      setNoteText(item.notes || "");
                    }}
                    className="pill-btn text-xs"
                  >
                    Notes
                  </button>
                  <button
                    onClick={() => removeItem(item.country_code)}
                    className="pill-btn text-xs"
                    style={{ borderColor: "#d4727a", color: "#d4727a" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div
        className="font-heading font-bold"
        style={{ fontSize: "1.8rem", color: "var(--gold)" }}
      >
        {value}
      </div>
      <div
        className="font-body"
        style={{ fontSize: "0.85rem", color: "var(--brown-light)" }}
      >
        {label}
      </div>
    </div>
  );
}
