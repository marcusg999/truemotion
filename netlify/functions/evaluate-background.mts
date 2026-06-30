import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { runEvaluationForArtist } from "../../src/lib/pipeline/evaluate.js";
import { runMdcExtraction } from "../../src/lib/pipeline/mdc.js";
import { MODEL_EXTRACTION } from "../../src/lib/anthropic.js";
import type { LlmCallUsage } from "../../src/lib/pipeline/evaluate.js";

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function estimateCost(model: string, usage: LlmCallUsage): number {
  const perMTok = {
    "claude-haiku-4-5-20251001": { input: 0.80, output: 4.0, cacheRead: 0.08, cacheWrite: 1.0 },
    "claude-sonnet-4-6":        { input: 3.0,  output: 15.0, cacheRead: 0.30, cacheWrite: 3.75 },
  } as Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }>;
  const rates = perMTok[model] ?? { input: 3.0, output: 15.0, cacheRead: 0.30, cacheWrite: 3.75 };
  return (
    (usage.input_tokens  * rates.input     +
     usage.output_tokens * rates.output    +
     usage.cache_read_tokens  * rates.cacheRead  +
     usage.cache_write_tokens * rates.cacheWrite) / 1_000_000
  );
}

const handler: Handler = async (event) => {
  const supabase = getSupabase();

  let jobId: string;
  try {
    ({ jobId } = JSON.parse(event.body ?? "{}"));
  } catch {
    return { statusCode: 400, body: "bad request" };
  }
  if (!jobId) return { statusCode: 400, body: "jobId required" };

  const { data: job, error: jobErr } = await supabase
    .from("evaluation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobErr || !job) {
    console.error(`[bg] job not found: ${jobId}`, jobErr?.message);
    return { statusCode: 404, body: "job not found" };
  }

  if (job.status !== "queued") {
    return { statusCode: 200, body: `job already ${job.status}` };
  }

  await supabase
    .from("evaluation_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  const usageLogs: Array<LlmCallUsage & { logged: boolean }> = [];

  async function onUsage(usage: LlmCallUsage) {
    const cost = estimateCost(usage.model, usage);
    await supabase.from("usage_log").insert({
      model: usage.model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_tokens: usage.cache_read_tokens,
      cache_write_tokens: usage.cache_write_tokens,
      estimated_cost_usd: cost,
      user_id: job.requested_by ?? null,
      ip_address: job.submitter_ip ?? null,
      route: job.kind === "extract_only" ? "/api/submit" : "/api/artists/[id]/evaluate",
      job_id: jobId,
    });
    usageLogs.push({ ...usage, logged: true });
  }

  try {
    if (job.kind === "extract_only") {
      const { data: artist } = await supabase
        .from("artists")
        .select("narrative")
        .eq("id", job.artist_id)
        .single();

      if (artist?.narrative) {
        const { normalized, usage } = await runMdcExtraction(artist.narrative);
        await onUsage({ model: MODEL_EXTRACTION, ...usage });
        await supabase
          .from("artists")
          .update({ mdc: normalized, updated_at: new Date().toISOString() })
          .eq("id", job.artist_id);
      }

      await supabase
        .from("evaluation_jobs")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", jobId);
    } else {
      const { evaluationId } = await runEvaluationForArtist(
        job.artist_id,
        job.reference_profile_id ?? null,
        onUsage
      );

      await supabase
        .from("evaluation_jobs")
        .update({
          status: "done",
          result_evaluation_id: evaluationId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[bg] evaluation failed for job ${jobId}:`, message);

    await supabase
      .from("evaluation_jobs")
      .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return { statusCode: 500, body: message };
  }

  return { statusCode: 200, body: "ok" };
};

export { handler };
