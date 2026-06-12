import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_SCORING_CONFIG } from "@/lib/config";
import type { Artist, Evaluation, MessageDraft, ScoringConfig } from "@/types";

export interface ArtistListItem {
  artist: Artist;
  latestEvaluation: Evaluation | null;
}

export async function listArtistsWithLatestEvaluation(): Promise<ArtistListItem[]> {
  const supabase = getSupabaseServerClient();

  const { data: artists, error: artistsError } = await supabase
    .from("artists")
    .select("*")
    .order("created_at", { ascending: false });

  if (artistsError) throw new Error(artistsError.message);

  const { data: evaluations, error: evalError } = await supabase
    .from("evaluations")
    .select("*")
    .order("created_at", { ascending: false });

  if (evalError) throw new Error(evalError.message);

  const latestByArtist = new Map<string, Evaluation>();
  for (const evaluation of evaluations ?? []) {
    if (!latestByArtist.has(evaluation.artist_id)) {
      latestByArtist.set(evaluation.artist_id, evaluation as Evaluation);
    }
  }

  return (artists ?? []).map((artist) => ({
    artist: artist as Artist,
    latestEvaluation: latestByArtist.get(artist.id) ?? null,
  }));
}

export interface ArtistDetail {
  artist: Artist;
  evaluations: Evaluation[];
  messageDrafts: MessageDraft[];
}

export async function getArtistDetail(id: string): Promise<ArtistDetail | null> {
  const supabase = getSupabaseServerClient();

  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .select("*")
    .eq("id", id)
    .single();

  if (artistError || !artist) return null;

  const { data: evaluations, error: evalError } = await supabase
    .from("evaluations")
    .select("*")
    .eq("artist_id", id)
    .order("created_at", { ascending: false });

  if (evalError) throw new Error(evalError.message);

  const { data: messageDrafts, error: messagesError } = await supabase
    .from("message_drafts")
    .select("*")
    .eq("artist_id", id)
    .order("created_at", { ascending: false });

  if (messagesError) throw new Error(messagesError.message);

  return {
    artist: artist as Artist,
    evaluations: (evaluations ?? []) as Evaluation[],
    messageDrafts: (messageDrafts ?? []) as MessageDraft[],
  };
}

export async function getScoringConfig(): Promise<ScoringConfig> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("scoring_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return { id: 1, ...DEFAULT_SCORING_CONFIG, updated_at: new Date().toISOString() };
  }

  return data as ScoringConfig;
}
