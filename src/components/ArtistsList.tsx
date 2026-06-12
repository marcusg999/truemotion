"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TierBadge } from "@/components/TierBadge";
import { TIER_LABELS } from "@/lib/config";
import type { ArtistListItem } from "@/lib/data";
import type { Tier } from "@/types";

type SortKey = "created_at" | "composite_score" | "confidence_score" | "name";

const ALL_TIERS: Tier[] = ["SIGN", "NURTURE", "GUIDE", "NOT_READY", "PASS"];

const TIER_RING: Record<Tier, string> = {
  SIGN: "#34c759",
  NURTURE: "#0a84ff",
  GUIDE: "#ff9f0a",
  NOT_READY: "#8e8e93",
  PASS: "#ff453a",
};

export function ArtistsList({ items }: { items: ArtistListItem[] }) {
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [archetypeFilter, setArchetypeFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.artist.region) set.add(item.artist.region);
    }
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let result = items.slice();

    if (tierFilter !== "ALL") {
      result = result.filter((item) => item.latestEvaluation?.tier === tierFilter);
    }

    if (archetypeFilter.trim()) {
      const needle = archetypeFilter.trim().toLowerCase();
      result = result.filter((item) =>
        item.latestEvaluation?.archetype_blend?.some((a) =>
          a.archetype.toLowerCase().includes(needle)
        )
      );
    }

    if (regionFilter) {
      result = result.filter((item) => item.artist.region === regionFilter);
    }

    if (minConfidence > 0) {
      result = result.filter(
        (item) => (item.latestEvaluation?.confidence_score ?? 0) >= minConfidence
      );
    }

    result.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.artist.name.localeCompare(b.artist.name);
        case "composite_score":
          return (
            (b.latestEvaluation?.composite_score ?? -1) -
            (a.latestEvaluation?.composite_score ?? -1)
          );
        case "confidence_score":
          return (
            (b.latestEvaluation?.confidence_score ?? -1) -
            (a.latestEvaluation?.confidence_score ?? -1)
          );
        case "created_at":
        default:
          return (
            new Date(b.artist.created_at).getTime() -
            new Date(a.artist.created_at).getTime()
          );
      }
    });

    return result;
  }, [items, tierFilter, archetypeFilter, regionFilter, minConfidence, sortKey]);

  const activeExtraFilters =
    (archetypeFilter ? 1 : 0) + (regionFilter ? 1 : 0) + (minConfidence > 0 ? 1 : 0);

  return (
    <div>
      {/* Tier chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 mb-3">
        <Chip active={tierFilter === "ALL"} onClick={() => setTierFilter("ALL")}>
          All
        </Chip>
        {ALL_TIERS.map((tier) => (
          <Chip key={tier} active={tierFilter === tier} onClick={() => setTierFilter(tier)}>
            {TIER_LABELS[tier]}
          </Chip>
        ))}
      </div>

      {/* Filters & sort */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="btn btn-ghost btn-sm"
        >
          Filters &amp; sort
          {activeExtraFilters > 0 && (
            <span
              className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[11px] font-bold text-white px-1"
              style={{ background: "var(--accent)" }}
            >
              {activeExtraFilters}
            </span>
          )}
        </button>

        {filtersOpen && (
          <div className="surface-card mt-2 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Archetype contains</label>
              <input
                className="input"
                placeholder="e.g. Griot"
                value={archetypeFilter}
                onChange={(e) => setArchetypeFilter(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Region</label>
              <select
                className="input"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
              >
                <option value="">All regions</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Min confidence: {minConfidence}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                className="w-full"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Sort by</label>
              <select
                className="input"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="created_at">Date added (newest)</option>
                <option value="composite_score">Composite score (highest)</option>
                <option value="confidence_score">Confidence (highest)</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(({ artist, latestEvaluation }) => {
          const topArchetype = latestEvaluation?.archetype_blend?.length
            ? [...latestEvaluation.archetype_blend].sort((a, b) => b.percentage - a.percentage)[0]
            : null;

          const ringColor = latestEvaluation
            ? TIER_RING[latestEvaluation.tier]
            : "var(--border)";

          return (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              className="surface-card p-4 flex items-center gap-4 active:scale-[0.99] transition-transform"
            >
              <ScoreRing
                value={latestEvaluation?.composite_score ?? null}
                color={ringColor}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold truncate">{artist.name}</p>
                  {latestEvaluation && <TierBadge tier={latestEvaluation.tier} size="sm" />}
                </div>
                <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                  {artist.region ?? "Region unknown"}
                  {topArchetype
                    ? ` · ${topArchetype.archetype} (${Math.round(topArchetype.percentage)}%)`
                    : ""}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {latestEvaluation
                    ? `Confidence ${latestEvaluation.confidence_score}% · ${new Date(
                        latestEvaluation.created_at
                      ).toLocaleDateString()}`
                    : "Not evaluated yet"}
                </p>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="surface-card p-8 text-center text-[var(--muted)] sm:col-span-2 lg:col-span-3">
            No artists match these filters.
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors"
      style={
        active
          ? {
              background: "var(--accent)",
              color: "var(--accent-foreground)",
              borderColor: "var(--accent)",
            }
          : { borderColor: "var(--border)", color: "var(--foreground)" }
      }
    >
      {children}
    </button>
  );
}

function ScoreRing({ value, color }: { value: number | null; color: string }) {
  const size = 48;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value != null ? Math.min(1, Math.max(0, value / 10)) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {value != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {value != null ? value.toFixed(1) : "—"}
      </div>
    </div>
  );
}
