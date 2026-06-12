import { AXIS_LABELS, SCORE_AXES, TIER_DESCRIPTIONS } from "@/lib/config";
import { TierBadge } from "@/components/TierBadge";
import { DraftOutreachButton } from "@/components/DraftOutreachButton";
import type { Evaluation } from "@/types";

export function EvaluationCard({
  evaluation,
  artistId,
  defaultOpen,
}: {
  evaluation: Evaluation;
  artistId: string;
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
