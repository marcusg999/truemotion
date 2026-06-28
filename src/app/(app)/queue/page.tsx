import Link from "next/link";
import { listCtasWithContext } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { TierBadge } from "@/components/TierBadge";
import { CtaPanel } from "@/components/CtaPanel";
import { SetupNotice } from "@/components/SetupNotice";
import type { Cta, Tier } from "@/types";

const STATUS_GROUPS = [
  { key: "pending", label: "Pending" },
  { key: "agreed", label: "Agreed" },
  { key: "actioned", label: "Actioned" },
] as const;

const ACTION_LABELS: Record<string, string> = {
  reach_out: "Reach Out",
  nurture: "Develop Relationship",
  watchlist: "Watch",
  pass: "Pass",
};

export default async function QueuePage() {
  let ctas;
  try {
    ctas = await listCtasWithContext();
  } catch (err) {
    return <SetupNotice error={err} />;
  }

  const currentUser = await getSessionUser();

  const grouped = Object.fromEntries(
    STATUS_GROUPS.map(({ key }) => [
      key,
      ctas.filter((c) => c.status === key),
    ])
  ) as Record<string, typeof ctas>;

  const total = ctas.length;
  const pending = grouped.pending.length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">CTA Queue</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {pending > 0 ? `${pending} pending` : "No pending actions"} · {total} total
          </p>
        </div>
      </div>

      {total === 0 && (
        <div className="surface-card p-10 text-center text-[var(--muted)]">
          <p className="mb-2">No CTAs yet.</p>
          <p className="text-sm">Run an evaluation and queue an action on an artist.</p>
        </div>
      )}

      {STATUS_GROUPS.map(({ key, label }) => {
        const items = grouped[key];
        if (items.length === 0) return null;

        return (
          <section key={key}>
            <h2 className="section-label mb-3">
              {label}
              <span className="ml-2 text-[var(--muted)] font-normal">({items.length})</span>
            </h2>
            <div className="space-y-3">
              {items.map((cta) => (
                <div key={cta.id} className="surface-card p-4 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        href={`/artists/${cta.artist_id}`}
                        className="font-semibold hover:underline"
                      >
                        {cta.artists?.name ?? "Unknown artist"}
                      </Link>
                      {cta.evaluations?.tier && (
                        <TierBadge tier={cta.evaluations.tier as Tier} size="sm" />
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {cta.artists?.region ?? "Region unknown"}
                      {cta.artists?.instagram_handle
                        ? ` · @${cta.artists.instagram_handle}`
                        : ""}
                      {cta.evaluations?.composite_score != null
                        ? ` · Score ${cta.evaluations.composite_score.toFixed(1)}`
                        : ""}
                    </p>
                    {cta.note && (
                      <p className="text-sm mt-1.5 text-[var(--foreground)] italic">
                        "{cta.note}"
                      </p>
                    )}
                    <p className="text-[11px] text-[var(--muted)] mt-1.5">
                      {new Date(cta.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="sm:w-48 flex-shrink-0 flex items-start">
                    <CtaPanel
                      evaluationId={cta.evaluation_id}
                      artistId={cta.artist_id}
                      tier={(cta.evaluations?.tier as Tier) ?? "GUIDE"}
                      cta={cta as Cta}
                      currentUser={currentUser}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
