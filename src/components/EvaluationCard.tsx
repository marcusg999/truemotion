import { AXIS_LABELS, SCORE_AXES, TIER_DESCRIPTIONS } from "@/lib/config";
import { TierBadge } from "@/components/TierBadge";
import { DraftOutreachButton } from "@/components/DraftOutreachButton";
import { CtaPanel } from "@/components/CtaPanel";
import type { Cta, Evaluation, MatchChecklistItem, SessionUser } from "@/types";

const STATUS_ICON: Record<MatchChecklistItem["status"], string> = {
  match: "✓",
  partial: "~",
  absent: "·",
};

const STATUS_COLOR: Record<MatchChecklistItem["status"], string> = {
  match: "#30d158",
  partial: "#ff9f0a",
  absent: "var(--muted)",
};

export function EvaluationCard({
  evaluation,
  artistId,
  cta,
  currentUser,
  defaultOpen,
}: {
  evaluation: Evaluation;
  artistId: string;
  cta: Cta | null;
  currentUser: SessionUser | null;
  defaultOpen?: boolean;
}) {
  const sortedArchetypes = [...(evaluation.archetype_blend ?? [])].sort(
    (a, b) => b.percentage - a.percentage
  );

  return (
    <details open={defaultOpen} className="surface-card overflow-hidden group">
      <summary className="cursor-pointer list-none px-5 py-4 flex flex-wrap items-center gap-3">
        <TierBadge tier={evaluation.tier} />
        <span className="font-semibold text-lg">{evaluation.composite_score.toFixed(1)}</span>
        <span className="text-xs text-[var(--muted)]">/ 10</span>
        <span className="text-sm text-[var(--muted)]">
          Confidence {evaluation.confidence_score}%
        </span>
        <span className="text-sm text-[var(--muted)] ml-auto">
          {new Date(evaluation.created_at).toLocaleString()}
        </span>
      </summary>

      <div className="px-5 pb-5 space-y-5 border-t border-[var(--border)] pt-4">
        <p className="text-sm text-[var(--muted)]">{TIER_DESCRIPTIONS[evaluation.tier]}</p>

        {evaluation.missing_fields?.length > 0 && (
          <p className="text-xs text-[var(--muted)]">
            Missing fields at evaluation time: {evaluation.missing_fields.join(", ")}
          </p>
        )}

        <div>
          <h3 className="section-label mb-2">Axis scores</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SCORE_AXES.map((axis) => {
              const score = evaluation[`${axis}_score` as keyof Evaluation] as number;
              const rationale = evaluation[
                `${axis}_rationale` as keyof Evaluation
              ] as string;
              const weight = evaluation.weights_used?.[axis];

              return (
                <div key={axis} className="rounded-xl bg-[var(--surface-2)] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-sm">{AXIS_LABELS[axis]}</span>
                    <span className="text-sm font-semibold">{score.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(score / 10) * 100}%`,
                        background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                      }}
                    />
                  </div>
                  {typeof weight === "number" && (
                    <div className="text-[11px] text-[var(--muted)] mb-1">
                      weight {Math.round(weight * 100)}%
                    </div>
                  )}
                  <p className="text-sm text-[var(--foreground)]">{rationale}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="section-label mb-2">Archetype blend</h3>
          {sortedArchetypes.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No archetype data.</p>
          ) : (
            <>
              <div className="space-y-2">
                {sortedArchetypes.map((entry) => (
                  <div key={entry.archetype}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{entry.archetype}</span>
                      <span className="text-[var(--muted)]">{Math.round(entry.percentage)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, entry.percentage)}%`,
                          background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {evaluation.archetype_justification && (
                <p className="text-sm text-[var(--muted)] mt-3">
                  {evaluation.archetype_justification}
                </p>
              )}
            </>
          )}
        </div>

        {evaluation.growth_path?.length > 0 && (
          <div>
            <h3 className="section-label mb-2">Growth path</h3>
            <ul className="space-y-1.5">
              {evaluation.growth_path.map((step, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span style={{ color: "var(--accent)" }}>•</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {evaluation.match_score !== null && evaluation.match_checklist?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="section-label">MDC match</h3>
              <span
                className="text-sm font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--surface-2)",
                  color:
                    (evaluation.match_score ?? 0) >= 7
                      ? "#30d158"
                      : (evaluation.match_score ?? 0) >= 4
                      ? "#ff9f0a"
                      : "#ff453a",
                }}
              >
                {evaluation.match_score?.toFixed(1)} / 10
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {evaluation.match_checklist
                .filter((item) => item.in_source_1)
                .map((item) => (
                  <span
                    key={`${item.category}:${item.term}`}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: STATUS_COLOR[item.status],
                    }}
                    title={`${item.status}: ${item.category}`}
                  >
                    <span className="font-mono text-[10px]">{STATUS_ICON[item.status]}</span>
                    {item.term.replace(/_/g, " ")}
                  </span>
                ))}
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-1.5">
              ✓ matched by artist · · not in artist profile
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-[var(--border)]">
          <h3 className="section-label mb-2">CTA</h3>
          <CtaPanel
            evaluationId={evaluation.id}
            artistId={artistId}
            tier={evaluation.tier}
            cta={cta}
            currentUser={currentUser}
          />
        </div>

        <div className="pt-2 border-t border-[var(--border)]">
          <h3 className="section-label mb-2">Outreach</h3>
          <DraftOutreachButton
            evaluationId={evaluation.id}
            tier={evaluation.tier}
            artistId={artistId}
          />
        </div>
      </div>
    </details>
  );
}
