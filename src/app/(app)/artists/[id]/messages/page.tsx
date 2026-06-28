import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtistDetail } from "@/lib/data";
import { MessageDraftCard } from "@/components/MessageDraftCard";
import { SetupNotice } from "@/components/SetupNotice";
import { ChevronLeftIcon } from "@/components/icons";

export default async function ArtistMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detail;
  try {
    detail = await getArtistDetail(id);
  } catch (err) {
    return <SetupNotice error={err} />;
  }

  if (!detail) notFound();

  const { artist, messageDrafts, evaluations } = detail;

  const byEvaluation = new Map<string, typeof messageDrafts>();
  for (const draft of messageDrafts) {
    const list = byEvaluation.get(draft.evaluation_id) ?? [];
    list.push(draft);
    byEvaluation.set(draft.evaluation_id, list);
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/artists/${artist.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        {artist.name}
      </Link>

      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Outreach drafts</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Every draft requires human approval or edit before it leaves the app.
          Nothing here is sent automatically.
        </p>
      </div>

      {byEvaluation.size === 0 ? (
        <div className="surface-card p-8 text-center text-[var(--muted)]">
          No outreach drafts yet.
        </div>
      ) : (
        Array.from(byEvaluation.entries()).map(([evalId, drafts]) => {
          const evaluation = evaluations.find((e) => e.id === evalId);
          return (
            <section key={evalId} className="space-y-3">
              <h2 className="section-label">
                {evaluation
                  ? `From evaluation on ${new Date(evaluation.created_at).toLocaleString()} — ${evaluation.tier} (${evaluation.composite_score.toFixed(1)})`
                  : "Outreach drafts"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {drafts.map((draft) => (
                  <MessageDraftCard key={draft.id} draft={draft} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
