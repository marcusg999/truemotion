"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cta, CtaAction, Tier, SessionUser } from "@/types";

const ACTION_LABELS: Record<CtaAction, string> = {
  reach_out: "Reach Out",
  nurture: "Develop Relationship",
  watchlist: "Watch",
  pass: "Pass",
};

const ACTION_COLOR: Record<CtaAction, string> = {
  reach_out: "#30d158",
  nurture: "#0a84ff",
  watchlist: "#ff9f0a",
  pass: "#ff453a",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Queued",
  agreed: "Agreed",
  actioned: "Actioned",
};

const TIER_SUGGESTED_ACTION: Record<Tier, CtaAction> = {
  SIGN: "reach_out",
  NURTURE: "nurture",
  GUIDE: "watchlist",
  NOT_READY: "watchlist",
  PASS: "pass",
};

interface Props {
  evaluationId: string;
  artistId: string;
  tier: Tier;
  cta: Cta | null;
  currentUser: SessionUser | null;
}

export function CtaPanel({ evaluationId, artistId, tier, cta, currentUser }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticCta, setOptimisticCta] = useState<Cta | null>(cta);

  async function createCta(action: CtaAction) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/cta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, artist_id: artistId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setOptimisticCta(data.cta);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: "agreed" | "actioned") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/cta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setOptimisticCta(data.cta);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const suggestedAction = TIER_SUGGESTED_ACTION[tier];
  const canAgree = currentUser?.role === "team" || currentUser?.role === "admin";
  const canAction = currentUser?.role === "admin";

  if (!optimisticCta) {
    const otherActions = (Object.keys(ACTION_LABELS) as CtaAction[]).filter(
      (a) => a !== suggestedAction
    );

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => createCta(suggestedAction)}
            disabled={loading}
          >
            {ACTION_LABELS[suggestedAction]}
          </button>
          {otherActions.map((action) => (
            <button
              key={action}
              className="btn btn-secondary btn-sm"
              onClick={() => createCta(action)}
              disabled={loading}
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{
            background: "var(--surface-2)",
            color: ACTION_COLOR[optimisticCta.action],
            border: "1px solid var(--border)",
          }}
        >
          {ACTION_LABELS[optimisticCta.action]}
        </span>
        <span className="text-xs text-[var(--muted)]">
          {STATUS_LABEL[optimisticCta.status]}
        </span>

        {optimisticCta.status === "pending" && canAgree && (
          <button
            className="btn btn-sm"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            onClick={() => updateStatus("agreed")}
            disabled={loading}
          >
            Agree
          </button>
        )}

        {optimisticCta.status === "agreed" && canAction && (
          <button
            className="btn btn-sm"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            onClick={() => updateStatus("actioned")}
            disabled={loading}
          >
            Mark done
          </button>
        )}

        <button
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={() => setOptimisticCta(null)}
          disabled={loading}
        >
          Change
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
