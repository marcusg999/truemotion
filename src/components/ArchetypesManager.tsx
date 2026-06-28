"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Archetype } from "@/types";

export function ArchetypesManager({ initial }: { initial: Archetype[] }) {
  const [archetypes, setArchetypes] = useState<Archetype[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleUpdate(id: string, patch: Partial<Archetype>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/archetypes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      setArchetypes((prev) => prev.map((a) => (a.id === id ? data.archetype : a)));
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete archetype "${name}"? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/archetypes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      setArchetypes((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(fields: { name: string; reference: string; description: string }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/archetypes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, display_order: archetypes.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setArchetypes((prev) => [...prev, data.archetype]);
      setAddOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {archetypes.map((archetype) =>
        editingId === archetype.id ? (
          <EditRow
            key={archetype.id}
            archetype={archetype}
            saving={saving}
            onSave={(patch) => handleUpdate(archetype.id, patch)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={archetype.id} className="surface-card p-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="font-semibold">{archetype.name}</p>
                {archetype.reference && (
                  <p className="text-xs text-[var(--muted)]">ref: {archetype.reference}</p>
                )}
              </div>
              {archetype.description && (
                <p className="text-sm text-[var(--muted)] mt-0.5">{archetype.description}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditingId(archetype.id)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: "var(--red, #ef4444)" }}
                onClick={() => handleDelete(archetype.id, archetype.name)}
                disabled={saving}
              >
                Delete
              </button>
            </div>
          </div>
        )
      )}

      {archetypes.length === 0 && (
        <div className="surface-card p-8 text-center text-[var(--muted)]">
          No archetypes yet. Add the first one below.
        </div>
      )}

      {addOpen ? (
        <AddRow
          saving={saving}
          onCreate={handleCreate}
          onCancel={() => setAddOpen(false)}
        />
      ) : (
        <button
          type="button"
          className="btn btn-secondary w-full"
          onClick={() => setAddOpen(true)}
        >
          + Add archetype
        </button>
      )}
    </div>
  );
}

function EditRow({
  archetype,
  saving,
  onSave,
  onCancel,
}: {
  archetype: Archetype;
  saving: boolean;
  onSave: (patch: Partial<Archetype>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(archetype.name);
  const [reference, setReference] = useState(archetype.reference);
  const [description, setDescription] = useState(archetype.description);

  return (
    <div className="surface-card p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Name</label>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Reference artist(s)</label>
          <input className="input w-full" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Description</label>
        <textarea
          className="input w-full h-20 resize-none"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={saving || !name.trim()}
          onClick={() => onSave({ name, reference, description })}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddRow({
  saving,
  onCreate,
  onCancel,
}: {
  saving: boolean;
  onCreate: (fields: { name: string; reference: string; description: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="surface-card p-4 space-y-3" style={{ border: "1px solid var(--accent)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
        New archetype
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">
            Name <span style={{ color: "var(--accent)" }}>*</span>
          </label>
          <input
            className="input w-full"
            placeholder="e.g. Street Preacher"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Reference artist(s)</label>
          <input
            className="input w-full"
            placeholder="e.g. Kendrick Lamar"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Description</label>
        <textarea
          className="input w-full h-20 resize-none"
          placeholder="Brief description of this archetype's defining traits…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={saving || !name.trim()}
          onClick={() => onCreate({ name, reference, description })}
        >
          {saving ? "Creating…" : "Create archetype"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
