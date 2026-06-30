import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SubmitSchema } from "@/lib/validation";

const HOURLY_SUBMIT_LIMIT = 3;

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not yet configured — skip
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  });
  const data = await res.json() as { success: boolean };
  return data.success === true;
}

export async function POST(request: NextRequest) {
  const ip = getIp(request);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, email, instagram_handle, region, style_tags, track_url, narrative, turnstile_token } = parsed.data;

  // Bot check
  if (turnstile_token) {
    const ok = await verifyTurnstile(turnstile_token);
    if (!ok) return NextResponse.json({ error: "Bot verification failed" }, { status: 400 });
  } else if (process.env.TURNSTILE_SECRET_KEY) {
    return NextResponse.json({ error: "Bot verification token required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // IP rate limit: max HOURLY_SUBMIT_LIMIT per hour
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from("evaluation_jobs")
    .select("*", { count: "exact", head: true })
    .eq("submitter_ip", ip)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= HOURLY_SUBMIT_LIMIT) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  const { data: artist, error: insertError } = await supabase
    .from("artists")
    .insert({
      name,
      email,
      source: "submission",
      instagram_handle: instagram_handle ?? null,
      region: region ?? null,
      style_tags: style_tags ?? [],
      track_url: track_url ?? null,
      narrative: narrative ?? null,
      signed_status: "unknown",
      alias: null,
      niche: null,
      affiliations: null,
      lyrical_focus: null,
      follower_count: null,
      avg_engagement: null,
      monthly_listeners: null,
      release_count: null,
      ig_url: instagram_handle
        ? `https://instagram.com/${instagram_handle.replace(/^@/, "")}`
        : null,
      epk_url: null,
      notes: null,
      mdc: [],
    })
    .select("id")
    .single();

  if (insertError || !artist) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to save submission" },
      { status: 500 }
    );
  }

  // Only queue Haiku extraction (no Sonnet scoring on public path)
  const { data: job } = await supabase
    .from("evaluation_jobs")
    .insert({
      artist_id: artist.id,
      kind: "extract_only",
      status: "queued",
      submitter_ip: ip,
    })
    .select("id")
    .single();

  if (job) {
    const bgUrl = process.env.URL
      ? `${process.env.URL}/.netlify/functions/evaluate-background`
      : null;

    if (bgUrl) {
      fetch(bgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      }).catch((err) => console.error("[submit] failed to fire background fn:", err));
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
