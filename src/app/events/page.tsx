import Link from "next/link";
import { listEventsWithArtist } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";

const EVENT_TYPE_LABELS: Record<string, string> = {
  call: "Call",
  meeting: "Meeting",
  follow_up: "Follow-up",
  showcase: "Showcase",
  other: "Other",
};

const EVENT_TYPE_COLOR: Record<string, string> = {
  call: "#0a84ff",
  meeting: "#30d158",
  follow_up: "#ff9f0a",
  showcase: "#bf5af2",
  other: "#8e8e93",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default async function EventsPage() {
  let events;
  try {
    events = await listEventsWithArtist();
  } catch (err) {
    return <SetupNotice error={err} />;
  }

  const now = new Date();
  const upcoming = events.filter((e) => !e.completed_at && new Date(e.scheduled_at) >= now);
  const past = events.filter((e) => e.completed_at || new Date(e.scheduled_at) < now);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Schedule</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          {upcoming.length} upcoming · {past.length} past
        </p>
      </div>

      {events.length === 0 && (
        <div className="surface-card p-10 text-center text-[var(--muted)]">
          <p className="mb-2">No events yet.</p>
          <p className="text-sm">Schedule a call or meeting from any artist profile.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="section-label mb-3">Upcoming</h2>
          <div className="space-y-2">
            {upcoming.map((event) => (
              <div key={event.id} className="surface-card px-4 py-3 flex items-start gap-3">
                <span
                  className="mt-0.5 shrink-0 text-[10px] font-semibold rounded px-1.5 py-0.5"
                  style={{
                    background: "var(--surface-2)",
                    color: EVENT_TYPE_COLOR[event.event_type] ?? "#8e8e93",
                    border: "1px solid var(--border)",
                  }}
                >
                  {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-[var(--muted)]">{formatDate(event.scheduled_at)}</p>
                  {event.notes && <p className="text-xs text-[var(--muted)] truncate mt-0.5">{event.notes}</p>}
                </div>
                {event.artists && (
                  <Link
                    href={`/artists/${event.artists.id}`}
                    className="text-xs font-medium shrink-0"
                    style={{ color: "var(--accent)" }}
                  >
                    {event.artists.name}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="section-label mb-3 text-[var(--muted)]">Past</h2>
          <div className="space-y-2 opacity-60">
            {past.slice(0, 20).map((event) => (
              <div key={event.id} className="surface-card px-4 py-3 flex items-start gap-3">
                <span
                  className="mt-0.5 shrink-0 text-[10px] font-semibold rounded px-1.5 py-0.5"
                  style={{
                    background: "var(--surface-2)",
                    color: EVENT_TYPE_COLOR[event.event_type] ?? "#8e8e93",
                    border: "1px solid var(--border)",
                  }}
                >
                  {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-through">{event.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {event.completed_at ? `Completed ${formatDate(event.completed_at)}` : formatDate(event.scheduled_at)}
                  </p>
                </div>
                {event.artists && (
                  <Link
                    href={`/artists/${event.artists.id}`}
                    className="text-xs font-medium shrink-0"
                    style={{ color: "var(--accent)" }}
                  >
                    {event.artists.name}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
