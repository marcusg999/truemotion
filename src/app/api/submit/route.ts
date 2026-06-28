import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runEvaluationForArtist } from "@/lib/pipeline/evaluate";

export async function POST(request: NextRequest) {
  let name: string,
    email: string,
    instagram_handle: string | null,
    region: string | null,
    style_tags: string[],
    track_url: string | null,
    narrative: string | null;

  try {
    const body = await request.json();
    name = body.name?.trim();
    email = body.email?.trim().toLowerCase();
    instagram_handle = body.instagram_handle?.trim() || null;
    region = body.region?.trim() || null;
    style_tags = Array.isArray(body.style_tags)
      ? body.style_tags.map((t: string) => t.trim()).filter(Boolean)
      : [];
    track_url = body.track_url?.trim() || null;
    narrative = body.narrative?.trim() || null;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();

  const { data: artist, error: insertError } = await supabase
    .from("artists")
    .insert({
      name,
      email,
      source: "submission",
      instagram_handle,
      region,
      style_tags,
      track_url,
      narrative,
      signed_status: "unknown",
      alias: null,
      niche: null,
      affiliations: null,
      lyrical_focus: null,
      follower_count: null,
      avg_engagement: null,
      monthly_listeners: null,
      release_count: null,
      ig_url: instagram_handle ? `https://instagram.com/${instagram_handle.replace(/^@/, "")}` : null,
      epk_url: null,
      notes: null,
      mdc: [],
    })
    .select()
    .single();

  if (insertError || !artist) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to save submission" }, { status: 500 });
  }

  // Fire evaluation in the background — do not await
  runEvaluationForArtist(artist.id).catch((err) => {
    console.error(`[submit] background evaluation failed for ${artist.id}:`, err);
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
