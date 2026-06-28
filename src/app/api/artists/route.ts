import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import type { Artist, ArtistInput, Evaluation } from "@/types";

export interface ArtistListItem {
  artist: Artist;
  latestEvaluation: Evaluation | null;
}

export async function GET() {
  const supabase = getSupabaseServerClient();

  const { data: artists, error: artistsError } = await supabase
    .from("artists")
    .select("*")
    .order("created_at", { ascending: false });

  if (artistsError) {
    return NextResponse.json({ error: artistsError.message }, { status: 500 });
  }

  const { data: evaluations, error: evalError } = await supabase
    .from("evaluations")
    .select("*")
    .order("created_at", { ascending: false });

  if (evalError) {
    return NextResponse.json({ error: evalError.message }, { status: 500 });
  }

  const latestByArtist = new Map<string, Evaluation>();
  for (const evaluation of evaluations ?? []) {
    if (!latestByArtist.has(evaluation.artist_id)) {
      latestByArtist.set(evaluation.artist_id, evaluation as Evaluation);
    }
  }

  const items: ArtistListItem[] = (artists ?? []).map((artist) => ({
    artist: artist as Artist,
    latestEvaluation: latestByArtist.get(artist.id) ?? null,
  }));

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const body = (await request.json()) as Partial<ArtistInput>;

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Artist name is required" }, { status: 400 });
  }

  const record = {
    name: body.name.trim(),
    alias: body.alias?.trim() || null,
    instagram_handle: body.instagram_handle?.trim().replace(/^@/, "") || null,
    region: body.region?.trim() || null,
    style_tags: body.style_tags ?? [],
    niche: body.niche?.trim() || null,
    affiliations: body.affiliations?.trim() || null,
    lyrical_focus: body.lyrical_focus?.trim() || null,
    signed_status: body.signed_status || "unknown",
    follower_count: body.follower_count ?? null,
    avg_engagement: body.avg_engagement ?? null,
    monthly_listeners: body.monthly_listeners ?? null,
    release_count: body.release_count ?? null,
    ig_url: body.ig_url?.trim() || null,
    track_url: body.track_url?.trim() || null,
    epk_url: body.epk_url?.trim() || null,
    notes: body.notes?.trim() || null,
    narrative: body.narrative?.trim() || null,
    mdc: body.mdc ?? [],
  };

  const { data, error } = await supabase
    .from("artists")
    .insert(record)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ artist: data as Artist }, { status: 201 });
}
