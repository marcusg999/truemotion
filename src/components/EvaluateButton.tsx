"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 14 * 60 * 1000; // 14 min (background fn limit is 15)

export function EvaluateButton({
  artistId,
  referenceProfileId,
}: {
  artistId: string;
  referenceProfileId?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "queuing" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setStatus("queuing");
    setError(null);

    try {
      const res = await fetch(`/api/artists/${artistId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: referenceProfileId ? JSON.stringify({ reference_profile_id: referenceProfileId }) : undefined,
      });
      const data = await res.json() as { jobId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to queue evaluation");

      const { jobId } = data;
      if (!jobId) throw new Error("No job ID returned");

      setStatus("running");
      await pollUntilDone(jobId);
      setStatus("done");
      router.refresh();
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Evaluation failed");
    }
  }

  async function pollUntilDone(jobId: string): Promise<void> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json() as { job?: { status: string; error?: string } };
      const jobStatus = data.job?.status;
      if (jobStatus === "done") return;
      if (jobStatus === "failed") throw new Error(data.job?.error ?? "Evaluation failed");
    }
    throw new Error("Evaluation timed out — check back in a moment");
  }

  const label =
    status === "queuing" ? "Queuing…" :
    status === "running" ? "Evaluating…" :
    status === "done"    ? "Done" :
    "Run evaluation";

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={status === "queuing" || status === "running"}
        className="btn btn-primary"
      >
        {label}
      </button>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
