"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AXIS_LABELS, SCORE_AXES, TIER_LABELS } from "@/lib/config";
import type { ScoringConfig, ScoringWeights, TierBand } from "@/types";

export function ScoringConfigForm({ initial }: { initial: ScoringConfig }) {
  const router = useRouter();
  const [weights, setWeights] = useState<ScoringWeights>(initial.weights);
  const [tierBands, setTierBands] = useState<TierBand[]>(initial.tier_bands);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const weightSum = SCORE_AXES.reduce((sum, axis) => sum + (weights[axis] ?? 0), 0);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights, tier_bands: tierBands }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save config");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="surface-card p-5">
        <h2 className="section-label mb-1">
          Axis weights
        </h2>
        <p className="text-sm text-[var(--muted)] mb-3">
          Composite score is the weighted average of the five axes. Weights do
          not need to sum to 1 — they&apos;re normalized automatically — but
          keeping them summed to 1 keeps the composite on a 0-10 scale that
          matches the tier bands below.
        </p>
        <div className="space-y-3">
          {SCORE_AXES.map((axis) => (
            <div key={axis} className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium">{AXIS_LABELS[axis]}</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                className="input w-28"
                value={weights[axis]}
                onChange={(e) =>
                  setWeights((prev) => ({ ...prev, [axis]: Number(e.target.value) }))
                }
              />
            </div>
          ))}
        </div>
        <p
          className="text-sm mt-2"
          style={{ color: Math.abs(weightSum - 1) > 0.001 ? "#ff9f0a" : "var(--muted)" }}
        >
          Sum: {weightSum.toFixed(2)}
          {Math.abs(weightSum - 1) > 0.001 && " — does not sum to 1.00"}
        </p>
      </section>

      <section className="surface-card p-5">
        <h2 className="section-label mb-1">
          Tier bands
        </h2>
        <p className="text-sm text-[var(--muted)] mb-3">
          Composite score ranges (0-10) that map to each tier. Bands should be
          non-overlapping and cover 0-10.
        </p>
        <div className="space-y-3">
          {tierBands.map((band, i) => (
            <div key={band.tier} className="flex items-center gap-3">
              <span className="w-28 text-sm font-medium">{TIER_LABELS[band.tier] ?? band.tier}</span>
              <input
                type="number"
                step="0.01"
                min={0}
                max={10}
                className="input w-24"
                value={band.min}
                onChange={(e) =>
                  setTierBands((prev) =>
                    prev.map((b, idx) => (idx === i ? { ...b, min: Number(e.target.value) } : b))
                  )
                }
              />
              <span className="text-sm text-[var(--muted)]">to</span>
              <input
                type="number"
                step="0.01"
                min={0}
                max={10}
                className="input w-24"
                value={band.max}
                onChange={(e) =>
                  setTierBands((prev) =>
                    prev.map((b, idx) => (idx === i ? { ...b, max: Number(e.target.value) } : b))
                  )
                }
              />
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-sm" style={{ color: "#ff453a" }}>{error}</p>}
      {saved && <p className="text-sm" style={{ color: "#34c759" }}>Saved.</p>}

      <button onClick={handleSave} disabled={saving} className="btn btn-primary">
        {saving ? "Saving…" : "Save configuration"}
      </button>

      <p className="text-xs text-[var(--muted)]">
        Last updated {new Date(initial.updated_at).toLocaleString()}. Changes
        apply to evaluations run after saving — past evaluations keep the
        weights that were active when they ran.
      </p>
    </div>
  );
}
