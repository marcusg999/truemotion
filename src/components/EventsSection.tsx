"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ArtistEvent, EventType } from "@/types";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  call: "Call",
  meeting: "Meeting",
  follow_up: "Follow-up",
  showcase: "Showcase",
  other: "Other",
};

const EVENT_TYPE_COLOR: Record<EventType, string> = {
  call: "#0a84ff",
  meeting: "#30d158",
  follow_up: "#ff9f0a",
  showcase: "#bf5af2",
  other: "#8e8e93",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

interface Props {
  artistId: string;
  initialEvents: ArtistEvent[];
}

export function EventsSection({ artistId, initialEvents }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>("call");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");

  const now = new Date();
  const upcoming = events.filter((e) => !e.completed_at && new Date(e.scheduled_at) >= now);
  const past = events.filter((e) => e.completed_at || new Date(e.scheduled_at) < now);

  async function handleAdd() {
    if (!title.trim() || !scheduledAt) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/artists/${artistId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), event_type: eventType, scheduled_at: scheduledAt, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setEvents((prev) => [...prev, data.event].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
      setTitle(""); setEventType("call"); setScheduledAt(""); setNotes("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function markComplete(event: ArtistEvent) {
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed_at: new Date().toISOString() }),
    });
    const data = await res.json();
    if (res.ok) {
      setEvents((prev) => prev.map((e) => e.id === event.id ? data.event : e));
      router.refresh();
    }
  }

  async function deleteEvent(id: string) {
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      router.refresh();
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-label">Schedule</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "+ Add event"}
        </button>
      </div>

      {showForm && (
        <div className="surface-card p-4 mb-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Title</label>
              <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Intro call" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select className="input w-full" value={eventType} onChange={(e) => setEventType(e.target.value as EventType)}>
                {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Date & time</label>
            <input type="datetime-local" className="input w-full" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea className="input w-full h-16 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={loading || !title.trim() || !scheduledAt}>
            {loading ? "Saving…" : "Save event"}
          </button>
        </div>
      )}

      {events.length === 0 && !showForm && (
        <p className="text-sm text-[var(--muted)]">No events scheduled yet.</p>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2 mb-4">
          {upcoming.map((event) => (
            <EventRow key={event.id} event={event} onComplete={markComplete} onDelete={deleteEvent} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-[var(--muted)] list-none flex items-center gap-1 mb-2">
            <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span>
            Past ({past.length})
          </summary>
          <div className="space-y-2 opacity-60">
            {past.map((event) => (
              <EventRow key={event.id} event={event} onComplete={markComplete} onDelete={deleteEvent} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function EventRow({
  event,
  onComplete,
  onDelete,
}: {
  event: ArtistEvent;
  onComplete: (e: ArtistEvent) => void;
  onDelete: (id: string) => void;
}) {
  const isDone = !!event.completed_at;
  return (
    <div className="surface-card px-4 py-3 flex items-start gap-3">
      <span
        className="mt-0.5 shrink-0 text-[10px] font-semibold rounded px-1.5 py-0.5"
        style={{
          background: "var(--surface-2)",
          color: EVENT_TYPE_COLOR[event.event_type],
          border: "1px solid var(--border)",
        }}
      >
        {EVENT_TYPE_LABELS[event.event_type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isDone ? "line-through text-[var(--muted)]" : ""}`}>{event.title}</p>
        <p className="text-xs text-[var(--muted)]">
          {isDone ? "Completed" : formatDate(event.scheduled_at)}
        </p>
        {event.notes && <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{event.notes}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isDone && (
          <button
            onClick={() => onComplete(event)}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Done
          </button>
        )}
        <button
          onClick={() => onDelete(event.id)}
          className="text-xs text-[var(--muted)] hover:text-red-500"
        >
          ×
        </button>
      </div>
    </div>
  );
}
