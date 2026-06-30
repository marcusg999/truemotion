import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let requestedProfileId: string | null = null;
  try {
    const body = await request.json();
    requestedProfileId = body?.reference_profile_id ?? null;
  } catch {
    // no body — fine
  }

  const supabase = getSupabaseServerClient();

  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .select("id")
    .eq("id", id)
    .single();

  if (artistError || !artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  // Enforce per-user daily quota
  const { data: config } = await supabase
    .from("scoring_config")
    .select("daily_eval_limit")
    .eq("id", 1)
    .single();
  const dailyLimit: number = (config as { daily_eval_limit?: number } | null)?.daily_eval_limit ?? 10;

  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count: todayCount } = await supabase
    .from("evaluation_jobs")
    .select("*", { count: "exact", head: true })
    .eq("requested_by", user.id)
    .gte("created_at", oneDayAgo);

  if ((todayCount ?? 0) >= dailyLimit) {
    return NextResponse.json(
      { error: `Daily evaluation limit of ${dailyLimit} reached` },
      { status: 429 }
    );
  }

  // Insert job
  const { data: job, error: jobError } = await supabase
    .from("evaluation_jobs")
    .insert({
      artist_id: id,
      reference_profile_id: requestedProfileId,
      kind: "full_eval",
      requested_by: user.id,
      status: "queued",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to queue evaluation" }, { status: 500 });
  }

  // Fire background function (Netlify returns 202 immediately)
  const bgUrl = process.env.URL
    ? `${process.env.URL}/.netlify/functions/evaluate-background`
    : null;

  if (bgUrl) {
    await fetch(bgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    }).catch((err) => console.error("[evaluate] failed to fire background fn:", err));
  } else {
    // Local dev: run synchronously (no Netlify URL)
    const { runEvaluationForArtist } = await import("@/lib/pipeline/evaluate");
    runEvaluationForArtist(id, requestedProfileId)
      .then(async ({ evaluationId }) => {
        await supabase
          .from("evaluation_jobs")
          .update({ status: "done", result_evaluation_id: evaluationId, updated_at: new Date().toISOString() })
          .eq("id", job.id);
      })
      .catch(async (err) => {
        await supabase
          .from("evaluation_jobs")
          .update({ status: "failed", error: String(err), updated_at: new Date().toISOString() })
          .eq("id", job.id);
      });
  }

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
