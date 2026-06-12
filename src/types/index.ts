export type SignedStatus = "independent" | "signed" | "unknown";

export type Tier = "SIGN" | "NURTURE" | "GUIDE" | "NOT_READY" | "PASS";

export type ScoreAxis =
  | "craft"
  | "traction"
  | "culture_fit"
  | "readiness"
  | "strategic_fit";

export type MessageTone = "warm" | "professional" | "hype";

export type MessageStatus = "draft" | "approved" | "edited" | "archived";

export interface Artist {
  id: string;
  name: string;
  alias: string | null;
  instagram_handle: string | null;
  region: string | null;
  style_tags: string[];
  niche: string | null;
  affiliations: string | null;
  lyrical_focus: string | null;
  signed_status: SignedStatus;
  follower_count: number | null;
  avg_engagement: number | null;
  monthly_listeners: number | null;
  release_count: number | null;
  ig_url: string | null;
  track_url: string | null;
  epk_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ArtistInput = Omit<Artist, "id" | "created_at" | "updated_at">;

export interface ArchetypeBlendEntry {
  archetype: string;
  percentage: number;
}

export interface AxisResult {
  score: number;
  rationale: string;
}

export interface Evaluation {
  id: string;
  artist_id: string;
  created_at: string;
  craft_score: number;
  craft_rationale: string;
  traction_score: number;
  traction_rationale: string;
  culture_fit_score: number;
  culture_fit_rationale: string;
  readiness_score: number;
  readiness_rationale: string;
  strategic_fit_score: number;
  strategic_fit_rationale: string;
  composite_score: number;
  confidence_score: number;
  tier: Tier;
  archetype_blend: ArchetypeBlendEntry[];
  archetype_justification: string;
  growth_path: string[];
  weights_used: ScoringWeights;
  missing_fields: string[];
}

export interface MessageDraft {
  id: string;
  evaluation_id: string;
  artist_id: string;
  tone: MessageTone;
  content: string;
  status: MessageStatus;
  created_at: string;
  approved_at: string | null;
}

export interface ScoringWeights {
  craft: number;
  traction: number;
  culture_fit: number;
  readiness: number;
  strategic_fit: number;
}

export interface TierBand {
  tier: Tier;
  min: number;
  max: number;
}

export interface ScoringConfig {
  id: number;
  weights: ScoringWeights;
  tier_bands: TierBand[];
  updated_at: string;
}
