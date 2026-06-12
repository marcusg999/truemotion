import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtistDetail } from "@/lib/data";
import { EvaluateButton } from "@/components/EvaluateButton";
import { EvaluationCard } from "@/components/EvaluationCard";
import { SetupNotice } from "@/components/SetupNotice";
import { ChevronLeftIcon, MessageIcon } from "@/components/icons";

export default async function ArtistDetailPage({
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

  const { artist, evaluations, messageDrafts } = detail;

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Pipeline
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            {artist.name}
            {artist.alias && (
              <span className="text-[var(--muted)] font-normal text-xl"> ({artist.alias})</span>
            )}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {artist.region ?? "Region unknown"}
            {artist.instagram_handle ? ` · @${artist.instagram_handle}` : ""}
            {artist.signed_status !== "unknown" ? ` · ${artist.signed_status}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messageDrafts.length > 0 && (
            <Link href={`/artists/${artist.id}/messages`} className="btn btn-secondary">
              <MessageIcon className="h-4 w-4" />
              Drafts ({messageDrafts.length})
            </Link>
          )}
          <EvaluateButton artistId={artist.id} />
        </div>
      </div>

      <section className="surface-card p-5">
        <h2 className="section-label mb-3">Profile</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Field label="Style tags" value={artist.style_tags?.join(", ") || "—"} />
          <Field label="Niche" value={artist.niche || "—"} />
          <Field label="Affiliations / cosigns" value={artist.affiliations || "—"} />
          <Field label="Lyrical focus" value={artist.lyrical_focus || "—"} />
          <Field
            label="Follower count"
            value={artist.follower_count?.toLocaleString() ?? "—"}
          />
          <Field
            label="Avg. engagement"
            value={
              artist.avg_engagement != null
                ? `${(artist.avg_engagement * 100).toFixed(1)}%`
                : "—"
            }
          />
          <Field
            label="Monthly listeners"
            value={artist.monthly_listeners?.toLocaleString() ?? "—"}
          />
          <Field label="Release count" value={artist.release_count?.toString() ?? "—"} />
        </dl>

        {(artist.ig_url || artist.track_url || artist.epk_url) && (
          <div className="flex gap-4 mt-4 text-sm">
            {artist.ig_url && (
              <a
                className="font-medium"
                style={{ color: "var(--accent)" }}
                href={artist.ig_url}
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            )}
            {artist.track_url && (
              <a
                className="font-medium"
                style={{ color: "var(--accent)" }}
                href={artist.track_url}
                target="_blank"
                rel="noreferrer"
              >
                Track
              </a>
            )}
            {artist.epk_url && (
              <a
                className="font-medium"
                style={{ color: "var(--accent)" }}
                href={artist.epk_url}
                target="_blank"
                rel="noreferrer"
              >
                EPK
              </a>
            )}
          </div>
        )}

        {artist.notes && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <h3 className="section-label mb-1">Scout notes</h3>
            <p className="text-sm whitespace-pre-wrap">{artist.notes}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="section-label mb-3">Evaluation history</h2>
        {evaluations.length === 0 ? (
          <div className="surface-card p-8 text-center text-[var(--muted)]">
            No evaluations yet. Run the first one above.
          </div>
        ) : (
          <div className="space-y-3">
            {evaluations.map((evaluation, i) => (
              <EvaluationCard
                key={evaluation.id}
                evaluation={evaluation}
                artistId={artist.id}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
