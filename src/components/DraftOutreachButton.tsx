"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tier } from "@/types";

export function DraftOutreachButton({
  evaluationId,
  tier,
  artistId,
}: {
  evaluationId: string;
  tier: Tier;
  artistId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forced, setForced] = useState(false);

  const isPass = tier === "PASS";

  async function handleClick(force: boolean) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/draft-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Drafting outreach failed");
      }

      if (force) setForced(true);

      if (data.messageDrafts?.length) {
        router.push(`/artists/${artistId}/messages`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drafting outreach failed");
    } finally {
      setLoading(false);
    }
  }

  if (isPass && !forced) {
    return (
      <div className="text-sm">
        <p className="text-[var(--muted)] mb-2">
          PASS tier — no outreach is drafted by default.
        </p>
        <button
          onClick={() => handleClick(true)}
          disabled={loading}
          className="btn btn-ghost btn-sm"
        >
          {loading ? "Drafting…" : "Draft anyway (manual override)"}
        </button>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => handleClick(false)} disabled={loading} className="btn btn-secondary">
        {loading ? "Drafting outreach…" : "Draft outreach messages"}
      </button>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
