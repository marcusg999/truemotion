import { getAnalyticsRaw } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { TIER_LABELS } from "@/lib/config";
import type { Tier } from "@/types";

const TIER_ORDER: Tier[] = ["SIGN", "NURTURE", "GUIDE", "NOT_READY", "PASS"];

const TIER_COLOR: Record<Tier, string> = {
  SIGN: "#34c759",
  NURTURE: "#0a84ff",
  GUIDE: "#ff9f0a",
  NOT_READY: "#8e8e93",
  PASS: "#ff453a",
};

const SCORE_BUCKETS = ["0–2", "2–4", "4–6", "6–8", "8–10"];

export default async function AnalyticsPage() {
  let raw;
  try {
    raw = await getAnalyticsRaw();
  } catch (err) {
    return <SetupNotice error={err} />;
  }

  const { artists, evaluations, ctas, deals } = raw;

  // Tier breakdown
  const byTier = Object.fromEntries(TIER_ORDER.map((t) => [t, 0])) as Record<Tier, number>;
  for (const e of evaluations) byTier[e.tier as Tier] = (byTier[e.tier as Tier] ?? 0) + 1;
  const unevaluated = artists.length - evaluations.length;
  const totalEvaluated = evaluations.length;

  // Score histogram
  const bucketCounts = [0, 0, 0, 0, 0];
  for (const e of evaluations) {
    const idx = Math.min(4, Math.floor(e.composite_score / 2));
    bucketCounts[idx]++;
  }
  const maxBucket = Math.max(...bucketCounts, 1);

  // Average scores
  const avgScore = totalEvaluated
    ? evaluations.reduce((s, e) => s + e.composite_score, 0) / totalEvaluated
    : 0;
  const avgConfidence = totalEvaluated
    ? evaluations.reduce((s, e) => s + e.confidence_score, 0) / totalEvaluated
    : 0;

  // Top archetypes
  const archetypeCounts: Record<string, number> = {};
  for (const e of evaluations) {
    for (const entry of e.archetype_blend ?? []) {
      if (entry.percentage >= 20) {
        archetypeCounts[entry.archetype] = (archetypeCounts[entry.archetype] ?? 0) + 1;
      }
    }
  }
  const topArchetypes = Object.entries(archetypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxArchetype = Math.max(...topArchetypes.map((a) => a[1]), 1);

  // CTAs
  const ctaPending = ctas.filter((c) => c.status === "pending").length;
  const ctaAgreed = ctas.filter((c) => c.status === "agreed").length;
  const ctaActioned = ctas.filter((c) => c.status === "actioned").length;

  // Deals
  const openDeals = deals.filter((d) => d.status !== "passed" && d.status !== "closed");
  const openDealValue = openDeals.reduce((s, d) => s + (d.deal_value ?? 0), 0);
  const allPayments = deals.flatMap((d) => d.deal_payments);
  const totalReceived = allPayments.filter((p) => p.received_date).reduce((s, p) => s + p.amount, 0);
  const totalExpected = allPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          {artists.length} artists · {totalEvaluated} evaluated · {unevaluated} pending
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total artists" value={artists.length.toString()} />
        <StatCard label="Evaluated" value={totalEvaluated.toString()} />
        <StatCard label="Avg score" value={avgScore.toFixed(1)} />
        <StatCard label="Avg confidence" value={`${Math.round(avgConfidence)}%`} />
        <StatCard label="CTA queue" value={ctaPending.toString()} sub="pending" />
        <StatCard label="Open deals" value={openDeals.length.toString()} sub={openDealValue > 0 ? `$${(openDealValue / 1000).toFixed(0)}k` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier breakdown */}
        <div className="surface-card p-5">
          <h2 className="section-label mb-4">Tier breakdown</h2>
          <div className="space-y-3">
            {TIER_ORDER.map((tier) => {
              const count = byTier[tier];
              const pct = artists.length > 0 ? (count / artists.length) * 100 : 0;
              return (
                <div key={tier}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{TIER_LABELS[tier]}</span>
                    <span className="text-[var(--muted)]">{count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: TIER_COLOR[tier] }}
                    />
                  </div>
                </div>
              );
            })}
            {unevaluated > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-[var(--muted)]">Not evaluated</span>
                  <span className="text-[var(--muted)]">{unevaluated}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(unevaluated / artists.length) * 100}%`, background: "var(--border)" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Score histogram */}
        <div className="surface-card p-5">
          <h2 className="section-label mb-4">Score distribution</h2>
          {totalEvaluated === 0 ? (
            <p className="text-sm text-[var(--muted)]">No evaluations yet.</p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {bucketCounts.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[var(--muted)]">{count > 0 ? count : ""}</span>
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${(count / maxBucket) * 100}%`,
                      minHeight: count > 0 ? "4px" : "0",
                      background: "linear-gradient(180deg, var(--accent), var(--accent-2))",
                    }}
                  />
                  <span className="text-[10px] text-[var(--muted)]">{SCORE_BUCKETS[i]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top archetypes */}
        <div className="surface-card p-5">
          <h2 className="section-label mb-4">Top archetypes</h2>
          {topArchetypes.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No archetype data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {topArchetypes.map(([name, count]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate pr-2">{name}</span>
                    <span className="text-[var(--muted)] shrink-0">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(count / maxArchetype) * 100}%`,
                        background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA + Deals summary */}
        <div className="surface-card p-5 space-y-5">
          <div>
            <h2 className="section-label mb-3">CTA queue</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <MiniStat label="Pending" value={ctaPending} color="#ff9f0a" />
              <MiniStat label="Agreed" value={ctaAgreed} color="#0a84ff" />
              <MiniStat label="Actioned" value={ctaActioned} color="#30d158" />
            </div>
          </div>
          <div className="pt-4 border-t border-[var(--border)]">
            <h2 className="section-label mb-3">Commission ledger</h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              <MiniStat
                label="Expected"
                value={`$${(totalExpected / 1000).toFixed(0)}k`}
                color="var(--foreground)"
              />
              <MiniStat
                label="Received"
                value={`$${(totalReceived / 1000).toFixed(0)}k`}
                color="#30d158"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="surface-card p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-[var(--muted)]">{sub}</p>}
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] mt-1">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-2)] p-3">
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] text-[var(--muted)]">{label}</p>
    </div>
  );
}
