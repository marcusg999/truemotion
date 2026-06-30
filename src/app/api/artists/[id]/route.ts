import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import type { Artist, ArtistInput, Evaluation, MessageDraft } from "@/types";

export interface ArtistDetailResponse {
  artist: Artist;
  evaluations: Evaluation[];
  messageDrafts: MessageDraft[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .select("*")
    .eq("id", id)
    .single();

  if (artistError || !artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  const { data: evaluations, error: evalError } = await supabase
    .from("evaluations")
    .select("*")
    .eq("artist_id", id)
    .order("created_at", { ascending: false });

  if (evalError) {
    return NextResponse.json({ error: evalError.message }, { status: 500 });
  }

  const { data: messageDrafts, error: messagesError } = await supabase
    .from("message_drafts")
    .select("*")
    .eq("artist_id", id)
    .order("created_at", { ascending: false });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const response: ArtistDetailResponse = {
    artist: artist as Artist,
    evaluations: (evaluations ?? []) as Evaluation[],
    messageDrafts: (messageDrafts ?? []) as MessageDraft[],
  };

  return NextResponse.json(response);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const body = (await request.json()) as Partial<ArtistInput>;

  const updatable: Record<string, unknown> = {};
  const allowedFields: (keyof ArtistInput)[] = [
    "name",
    "alias",
    "instagram_handle",
    "region",
    "style_tags",
    "niche",
    "affiliations",
    "lyrical_focus",
    "signed_status",
    "follower_count",
    "avg_engagement",
    "monthly_listeners",
    "release_count",
    "ig_url",
    "track_url",
    "epk_url",
    "notes",
  ];

  for (const field of allowedFields) {
    if (field in body) {
      updatable[field] = body[field];
    }
  }

  if (Object.keys(updatable).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("artists")
    .update(updatable)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ artist: data as Artist });
}
