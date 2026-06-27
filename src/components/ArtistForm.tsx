"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ArtistInput, MdcCategory, MdcEntry, SignedStatus } from "@/types";

const MDC_CATEGORIES: MdcCategory[] = ["genre", "region", "theme", "adjective", "affiliation", "intelligence"];

const CATEGORY_LABELS: Record<MdcCategory, string> = {
  genre: "Genre", region: "Region", theme: "Theme",
  adjective: "Adjective", affiliation: "Affiliation", intelligence: "Intelligence",
};

const EMPTY_FORM = {
  name: "",
  alias: "",
  instagram_handle: "",
  region: "",
  style_tags: "",
  niche: "",
  affiliations: "",
  lyrical_focus: "",
  signed_status: "unknown" as SignedStatus,
  follower_count: "",
  avg_engagement: "",
  monthly_listeners: "",
  release_count: "",
  ig_url: "",
  track_url: "",
  epk_url: "",
  notes: "",
  narrative: "",
};

export function ArtistForm() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [mdc, setMdc] = useState<MdcEntry[]>([]);
  const [uncanonicalized, setUncanonicalized] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExtractMdc() {
    if (!form.narrative.trim()) return;
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/mdc/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative: form.narrative }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "MDC extraction failed");
      const existing = new Set(mdc.map((e) => `${e.category}:${e.term}`));
      setMdc([
        ...mdc,
        ...(data.normalized as MdcEntry[]).filter(
          (e: MdcEntry) => !existing.has(`${e.category}:${e.term}`)
        ),
      ]);
      setUncanonicalized(data.uncanonicalized ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "MDC extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: Partial<ArtistInput> = {
      name: form.name,
      alias: form.alias || undefined,
      instagram_handle: form.instagram_handle || undefined,
      region: form.region || undefined,
      style_tags: form.style_tags
        ? form.style_tags.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      niche: form.niche || undefined,
      affiliations: form.affiliations || undefined,
      lyrical_focus: form.lyrical_focus || undefined,
      signed_status: form.signed_status,
      follower_count: form.follower_count ? Number(form.follower_count) : undefined,
      avg_engagement: form.avg_engagement ? Number(form.avg_engagement) : undefined,
      monthly_listeners: form.monthly_listeners ? Number(form.monthly_listeners) : undefined,
      release_count: form.release_count ? Number(form.release_count) : undefined,
      ig_url: form.ig_url || undefined,
      track_url: form.track_url || undefined,
      epk_url: form.epk_url || undefined,
      notes: form.notes || undefined,
      narrative: form.narrative || undefined,
      mdc: mdc.length > 0 ? mdc : undefined,
    };

    try {
      const res = await fetch("/api/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create artist");
      }

      router.push(`/artists/${data.artist.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create artist");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-xl text-sm p-3" style={{ background: "color-mix(in srgb, #ff453a 12%, transparent)", color: "#ff453a" }}>
          {error}
        </div>
      )}

      <section className="surface-card p-5">
        <h2 className="section-label mb-3">
          Identity
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name / alias" required>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>
          <Field label="Alternate alias">
            <input
              className="input"
              value={form.alias}
              onChange={(e) => update("alias", e.target.value)}
            />
          </Field>
          <Field label="Instagram handle">
            <input
              className="input"
              placeholder="without @"
              value={form.instagram_handle}
              onChange={(e) => update("instagram_handle", e.target.value)}
            />
          </Field>
          <Field label="Region">
            <input
              className="input"
              placeholder="e.g. Atlanta, GA"
              value={form.region}
              onChange={(e) => update("region", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="section-label mb-3">
          Quantitative
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Follower count">
            <input
              type="number"
              min={0}
              className="input"
              value={form.follower_count}
              onChange={(e) => update("follower_count", e.target.value)}
            />
          </Field>
          <Field label="Average engagement rate (e.g. 0.045 = 4.5%)">
            <input
              type="number"
              step="0.001"
              min={0}
              className="input"
              value={form.avg_engagement}
              onChange={(e) => update("avg_engagement", e.target.value)}
            />
          </Field>
          <Field label="Monthly listeners">
            <input
              type="number"
              min={0}
              className="input"
              value={form.monthly_listeners}
              onChange={(e) => update("monthly_listeners", e.target.value)}
            />
          </Field>
          <Field label="Release count">
            <input
              type="number"
              min={0}
              className="input"
              value={form.release_count}
              onChange={(e) => update("release_count", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="section-label mb-3">
          Qualitative
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Style / sound tags (comma separated)">
            <input
              className="input"
              placeholder="e.g. trap, melodic, southern"
              value={form.style_tags}
              onChange={(e) => update("style_tags", e.target.value)}
            />
          </Field>
          <Field label="Niche">
            <input
              className="input"
              value={form.niche}
              onChange={(e) => update("niche", e.target.value)}
            />
          </Field>
          <Field label="Affiliations / cosigns">
            <input
              className="input"
              value={form.affiliations}
              onChange={(e) => update("affiliations", e.target.value)}
            />
          </Field>
          <Field label="Lyrical focus">
            <input
              className="input"
              value={form.lyrical_focus}
              onChange={(e) => update("lyrical_focus", e.target.value)}
            />
          </Field>
          <Field label="Signed status">
            <select
              className="input"
              value={form.signed_status}
              onChange={(e) => update("signed_status", e.target.value as SignedStatus)}
            >
              <option value="unknown">Unknown</option>
              <option value="independent">Independent</option>
              <option value="signed">Signed</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="section-label mb-3">
          Links (stored as references, not auto-parsed in v1)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Instagram URL">
            <input
              className="input"
              value={form.ig_url}
              onChange={(e) => update("ig_url", e.target.value)}
            />
          </Field>
          <Field label="Track URL">
            <input
              className="input"
              value={form.track_url}
              onChange={(e) => update("track_url", e.target.value)}
            />
          </Field>
          <Field label="EPK URL">
            <input
              className="input"
              value={form.epk_url}
              onChange={(e) => update("epk_url", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="section-label mb-3">
          Scout notes
        </h2>
        <Field label="Notes">
          <textarea
            className="input min-h-24"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>
      </section>

      <section className="surface-card p-5 space-y-4">
        <div>
          <h2 className="section-label mb-0.5">Narrative & MDC</h2>
          <p className="text-xs text-[var(--muted)]">
            Free-text narrative used to extract MDC tags for matching against reference profiles.
          </p>
        </div>
        <Field label="Artist narrative">
          <textarea
            className="input min-h-24"
            value={form.narrative}
            onChange={(e) => update("narrative", e.target.value)}
            placeholder="Describe the artist's identity, sound, themes, and positioning..."
          />
        </Field>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={extracting || !form.narrative.trim()}
            onClick={handleExtractMdc}
            className="btn btn-ghost btn-sm"
          >
            {extracting ? "Extracting…" : "Extract & supplement MDC"}
          </button>
          {mdc.length > 0 && (
            <span className="text-xs text-[var(--muted)]">{mdc.length} tags</span>
          )}
        </div>

        {mdc.length > 0 && (
          <div className="space-y-2">
            {MDC_CATEGORIES.map((cat) => {
              const entries = mdc.filter((e) => e.category === cat);
              if (entries.length === 0) return null;
              return (
                <div key={cat} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-[var(--muted)] w-20 shrink-0">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  {entries.map((e) => (
                    <span
                      key={`${e.category}:${e.term}`}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    >
                      {e.term.replace(/_/g, " ")}
                      <button
                        type="button"
                        onClick={() =>
                          setMdc((prev) =>
                            prev.filter((x) => !(x.category === e.category && x.term === e.term))
                          )
                        }
                        className="ml-0.5 text-[var(--muted)] hover:text-[var(--foreground)] leading-none"
                        aria-label={`Remove ${e.term}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {uncanonicalized.length > 0 && (
          <div
            className="rounded-xl p-3 text-sm"
            style={{ background: "color-mix(in srgb, #ff9f0a 10%, transparent)" }}
          >
            <p className="font-medium">Unrecognized tags:</p>
            <p className="text-[var(--muted)] text-xs mt-0.5">{uncanonicalized.join(" · ")}</p>
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={submitting || !form.name.trim()}
        className="btn btn-primary"
      >
        {submitting ? "Saving…" : "Save artist"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">
        {label}
        {required && <span style={{ color: "#ff453a" }}> *</span>}
      </span>
      {children}
    </label>
  );
}
