"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MessageDraft } from "@/types";

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  draft: { bg: "var(--surface-2)", fg: "var(--muted)" },
  edited: { bg: "#0a84ff", fg: "#ffffff" },
  approved: { bg: "#34c759", fg: "#ffffff" },
  archived: { bg: "var(--surface-2)", fg: "var(--muted)" },
};

export function MessageDraftCard({ draft }: { draft: MessageDraft }) {
  const router = useRouter();
  const [content, setContent] = useState(draft.content);
  const [status, setStatus] = useState(draft.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = content !== draft.content;
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.draft;

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update message");
      setStatus(data.messageDraft.status);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update message");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="surface-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold capitalize">{draft.tone}</span>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: statusStyle.bg, color: statusStyle.fg }}
        >
          {status}
        </span>
      </div>

      <textarea
        className="input min-h-32"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={status === "archived"}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 flex-wrap">
        <button
          className="btn btn-secondary btn-sm"
          disabled={!dirty || saving}
          onClick={() => patch({ content })}
        >
          Save edit
        </button>
        <button
          className="btn btn-primary btn-sm"
          disabled={saving || status === "approved"}
          onClick={() => patch({ status: "approved", ...(dirty ? { content } : {}) })}
        >
          Approve
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={saving || status === "archived"}
          onClick={() => patch({ status: "archived" })}
        >
          Archive
        </button>
      </div>
    </div>
  );
}
