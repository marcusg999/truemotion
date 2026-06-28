import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_SCORING_CONFIG } from "@/lib/config";
import type {
  Artist,
  ArtistEvent,
  Cta,
  Deal,
  DealPayment,
  DealSplit,
  DealWithLedger,
  Evaluation,
  MessageDraft,
  MdcTaxonomyTerm,
  ReferenceProfile,
  ReferenceProfileInput,
  ScoringConfig,
} from "@/types";

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
  ctas: Cta[];
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

  const { data: ctas, error: ctasError } = await supabase
    .from("ctas")
    .select("*")
    .eq("artist_id", id);

  if (ctasError) throw new Error(ctasError.message);

  return {
    artist: artist as Artist,
    evaluations: (evaluations ?? []) as Evaluation[],
    messageDrafts: (messageDrafts ?? []) as MessageDraft[],
    ctas: (ctas ?? []) as Cta[],
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

export async function listReferenceProfiles(): Promise<ReferenceProfile[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reference_profiles")
    .select("*")
    .order("type")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as ReferenceProfile[];
}

export async function getReferenceProfile(id: string): Promise<ReferenceProfile | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reference_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as ReferenceProfile;
}

export async function getTrpMasterProfile(): Promise<ReferenceProfile | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reference_profiles")
    .select("*")
    .eq("type", "master")
    .order("created_at")
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as ReferenceProfile;
}

export async function createReferenceProfile(
  input: ReferenceProfileInput
): Promise<ReferenceProfile> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reference_profiles")
    .insert({
      name: input.name,
      type: input.type,
      narrative: input.narrative ?? null,
      mdc: input.mdc ?? [],
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create profile");
  return data as ReferenceProfile;
}

export async function updateReferenceProfile(
  id: string,
  input: Partial<ReferenceProfileInput>
): Promise<ReferenceProfile> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reference_profiles")
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.narrative !== undefined && { narrative: input.narrative }),
      ...(input.mdc !== undefined && { mdc: input.mdc }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update profile");
  return data as ReferenceProfile;
}

export async function deleteReferenceProfile(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("reference_profiles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getMdcTaxonomy(): Promise<MdcTaxonomyTerm[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("mdc_taxonomy")
    .select("*")
    .order("category")
    .order("canonical_term");

  if (error) throw new Error(error.message);
  return (data ?? []) as MdcTaxonomyTerm[];
}

export interface CtaWithContext extends Cta {
  artists: { id: string; name: string; region: string | null; instagram_handle: string | null } | null;
  evaluations: { id: string; tier: string; composite_score: number; created_at: string } | null;
}

export async function listCtasWithContext(): Promise<CtaWithContext[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ctas")
    .select(`
      *,
      artists ( id, name, region, instagram_handle ),
      evaluations ( id, tier, composite_score, created_at )
    `)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CtaWithContext[];
}

// Events

export async function getArtistEvents(artistId: string): Promise<ArtistEvent[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("artist_id", artistId)
    .order("scheduled_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ArtistEvent[];
}

export interface EventWithArtist extends ArtistEvent {
  artists: { id: string; name: string } | null;
}

export async function listEventsWithArtist(): Promise<EventWithArtist[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, artists ( id, name )")
    .order("scheduled_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as EventWithArtist[];
}

// Deals

export async function getArtistDeals(artistId: string): Promise<DealWithLedger[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*, deal_payments (*), deal_splits (*)")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DealWithLedger[];
}

export interface DealWithArtist extends Deal {
  deal_payments: DealPayment[];
  deal_splits: DealSplit[];
  artists: { id: string; name: string } | null;
}

export async function listDealsWithArtist(): Promise<DealWithArtist[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*, deal_payments (*), deal_splits (*), artists ( id, name )")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DealWithArtist[];
}

// Analytics raw data

export interface AnalyticsRaw {
  artists: Pick<Artist, "id" | "created_at">[];
  evaluations: Pick<
    Evaluation,
    "id" | "tier" | "composite_score" | "confidence_score" | "archetype_blend" | "created_at"
  >[];
  ctas: Pick<Cta, "id" | "status">[];
  deals: (Pick<Deal, "id" | "status" | "deal_value" | "commission_pct"> & {
    deal_payments: Pick<DealPayment, "amount" | "received_date">[];
  })[];
}

export async function getAnalyticsRaw(): Promise<AnalyticsRaw> {
  const supabase = getSupabaseServerClient();

  const [artistsRes, evaluationsRes, ctasRes, dealsRes] = await Promise.all([
    supabase.from("artists").select("id, created_at"),
    supabase
      .from("evaluations")
      .select("id, tier, composite_score, confidence_score, archetype_blend, created_at"),
    supabase.from("ctas").select("id, status"),
    supabase.from("deals").select("id, status, deal_value, commission_pct, deal_payments ( amount, received_date )"),
  ]);

  if (artistsRes.error) throw new Error(artistsRes.error.message);
  if (evaluationsRes.error) throw new Error(evaluationsRes.error.message);
  if (ctasRes.error) throw new Error(ctasRes.error.message);
  if (dealsRes.error) throw new Error(dealsRes.error.message);

  return {
    artists: (artistsRes.data ?? []) as AnalyticsRaw["artists"],
    evaluations: (evaluationsRes.data ?? []) as AnalyticsRaw["evaluations"],
    ctas: (ctasRes.data ?? []) as AnalyticsRaw["ctas"],
    deals: (dealsRes.data ?? []) as AnalyticsRaw["deals"],
  };
}
