"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";
import type { MdcCategory, MdcEntry, ReferenceProfile, ReferenceProfileType } from "@/types";

const MDC_CATEGORIES: MdcCategory[] = ["genre", "region", "theme", "adjective", "affiliation", "intelligence"];

const CATEGORY_LABELS: Record<MdcCategory, string> = {
  genre: "Genre",
  region: "Region",
  theme: "Theme",
  adjective: "Adjective",
  affiliation: "Affiliation",
  intelligence: "Intelligence",
};

const TYPE_LABELS: Record<ReferenceProfileType, string> = {
  master: "Master",
  archetype: "Archetype",
  campaign: "Campaign",
};

// -----------------------------------------------------------------------
// MDC tag chip
// -----------------------------------------------------------------------
function MdcTag({
  entry,
  onRemove,
}: {
  entry: MdcEntry;
  onRemove?: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <span className="text-[var(--muted)]">{entry.category}:</span>
      {entry.term.replace(/_/g, " ")}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 text-[var(--muted)] hover:text-[var(--foreground)] leading-none"
          aria-label={`Remove ${entry.term}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

// -----------------------------------------------------------------------
// Profile form (create or edit)
// -----------------------------------------------------------------------
function ProfileForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ReferenceProfile;
  onSave: (profile: ReferenceProfile) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<ReferenceProfileType>(initial?.type ?? "master");
  const [narrative, setNarrative] = useState(initial?.narrative ?? "");
  const [mdc, setMdc] = useState<MdcEntry[]>(initial?.mdc ?? []);
  const [extracting, setExtracting] = useState(false);
  const [uncanonicalized, setUncanonicalized] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExtract() {
    if (!narrative.trim()) return;
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/mdc/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      // Merge, dedup by category+term
      const existing = new Set(mdc.map((e) => `${e.category}:${e.term}`));
      const merged = [
        ...mdc,
        ...(data.normalized as MdcEntry[]).filter(
          (e: MdcEntry) => !existing.has(`${e.category}:${e.term}`)
        ),
      ];
      setMdc(merged);
      setUncanonicalized(data.uncanonicalized ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const method = initial ? "PUT" : "POST";
      const url = initial ? `/api/profiles/${initial.id}` : "/api/profiles";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, narrative: narrative || null, mdc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSave(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  const byCategory = MDC_CATEGORIES.reduce<Record<MdcCategory, MdcEntry[]>>(
    (acc, cat) => {
      acc[cat] = mdc.filter((e) => e.category === cat);
      return acc;
    },
    {} as Record<MdcCategory, MdcEntry[]>
  );

  return (
    <div className="surface-card p-5 space-y-4">
      {error && (
        <div
          className="rounded-xl text-sm p-3"
          style={{ background: "color-mix(in srgb, #ff453a 12%, transparent)", color: "#ff453a" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">
            Profile name <span style={{ color: "#ff453a" }}>*</span>
          </span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. TRP Master Profile"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Type</span>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as ReferenceProfileType)}
          >
            <option value="master">Master</option>
            <option value="archetype">Archetype</option>
            <option value="campaign">Campaign</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium mb-1">Narrative</span>
        <textarea
          className="input min-h-28"
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Describe what this profile is looking for in an artist..."
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={extracting || !narrative.trim()}
          onClick={handleExtract}
          className="btn btn-ghost btn-sm"
        >
          {extracting ? "Extracting…" : "Extract MDC from narrative"}
        </button>
        {mdc.length > 0 && (
          <span className="text-xs text-[var(--muted)]">{mdc.length} tags</span>
        )}
      </div>

      {mdc.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">MDC tags</p>
          {MDC_CATEGORIES.map((cat) => {
            const entries = byCategory[cat];
            if (entries.length === 0) return null;
            return (
              <div key={cat} className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-[var(--muted)] w-20 shrink-0">
                  {CATEGORY_LABELS[cat]}
                </span>
                {entries.map((e) => (
                  <MdcTag
                    key={`${e.category}:${e.term}`}
                    entry={e}
                    onRemove={() =>
                      setMdc((prev) =>
                        prev.filter((x) => !(x.category === e.category && x.term === e.term))
                      )
                    }
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {uncanonicalized.length > 0 && (
        <div
          className="rounded-xl p-3 text-sm space-y-1"
          style={{ background: "color-mix(in srgb, #ff9f0a 10%, transparent)" }}
        >
          <p className="font-medium text-[var(--foreground)]">
            Unrecognized tags (not in taxonomy):
          </p>
          <p className="text-[var(--muted)]">{uncanonicalized.join(" · ")}</p>
          <p className="text-xs text-[var(--muted)]">
            Add these terms to the MDC taxonomy to make them matchable.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={handleSave}
          className="btn btn-primary"
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Create profile"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Profile card
// -----------------------------------------------------------------------
function ProfileCard({
  profile,
  onEdit,
  onDelete,
}: {
  profile: ReferenceProfile;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${profile.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete();
  }

  const tagCount = profile.mdc?.length ?? 0;

  return (
    <div className="surface-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{profile.name}</h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--surface-2)", color: "var(--muted)" }}
            >
              {TYPE_LABELS[profile.type]}
            </span>
          </div>
          {tagCount > 0 && (
            <p className="text-xs text-[var(--muted)] mt-0.5">{tagCount} MDC tags</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={onEdit} className="btn btn-ghost btn-sm">
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-ghost btn-sm"
            style={{ color: "#ff453a" }}
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>

      {profile.narrative && (
        <p className="text-sm text-[var(--muted)] line-clamp-2">{profile.narrative}</p>
      )}

      {tagCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.mdc.slice(0, 8).map((e) => (
            <MdcTag key={`${e.category}:${e.term}`} entry={e} />
          ))}
          {tagCount > 8 && (
            <span className="text-xs text-[var(--muted)] self-center">+{tagCount - 8} more</span>
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------
export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<ReferenceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ReferenceProfile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profiles");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setProfiles(data.profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }

  const showForm = creating || editing !== null;

  return (
    <div className="space-y-6">
      <Link
        href="/config"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:hidden"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Scoring config
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Reference profiles</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Source Major profiles define what TRP is looking for. Artists are matched against them
            during evaluation.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn btn-primary shrink-0"
          >
            New profile
          </button>
        )}
      </div>

      {error && (
        <div
          className="rounded-xl text-sm p-3"
          style={{ background: "color-mix(in srgb, #ff453a 12%, transparent)", color: "#ff453a" }}
        >
          {error}
        </div>
      )}

      {showForm && (
        <ProfileForm
          initial={editing ?? undefined}
          onSave={(saved) => {
            setProfiles((prev) => {
              const idx = prev.findIndex((p) => p.id === saved.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = saved;
                return next;
              }
              return [saved, ...prev];
            });
            setCreating(false);
            setEditing(null);
          }}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : profiles.length === 0 && !showForm ? (
        <div className="surface-card p-8 text-center">
          <p className="text-[var(--muted)]">No reference profiles yet.</p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn btn-primary mt-4"
          >
            Create first profile
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.map((p) =>
            editing?.id === p.id ? null : (
              <ProfileCard
                key={p.id}
                profile={p}
                onEdit={() => {
                  setCreating(false);
                  setEditing(p);
                }}
                onDelete={() => handleDelete(p.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
