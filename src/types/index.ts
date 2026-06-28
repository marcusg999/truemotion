export type SignedStatus = "independent" | "signed" | "unknown";

export interface Archetype {
  id: string;
  name: string;
  reference: string;
  description: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type ArchetypeInput = Pick<Archetype, "name" | "reference" | "description" | "display_order">;

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
  email: string | null;
  source: "manual" | "submission";
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
  narrative: string | null;
  mdc: MdcEntry[];
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
  reference_profile_id: string | null;
  match_score: number | null;
  match_checklist: MatchChecklistItem[];
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

// MDC matching

export type MdcCategory = "genre" | "region" | "theme" | "adjective" | "affiliation" | "intelligence";

export interface MdcEntry {
  category: MdcCategory;
  term: string;
  weight: number;
}

export interface MdcTaxonomyTerm {
  id: string;
  category: MdcCategory;
  canonical_term: string;
  synonyms: string[];
  weight: number;
  created_at: string;
}

export type ReferenceProfileType = "master" | "archetype" | "campaign";

export interface ReferenceProfile {
  id: string;
  name: string;
  type: ReferenceProfileType;
  narrative: string | null;
  mdc: MdcEntry[];
  created_at: string;
  updated_at: string;
}

export type ReferenceProfileInput = Omit<ReferenceProfile, "id" | "created_at" | "updated_at">;

export type MatchStatus = "match" | "partial" | "absent";

export interface MatchChecklistItem {
  category: MdcCategory;
  term: string;
  status: MatchStatus;
  in_source_1: boolean;
  in_source_2: boolean;
}

// CTA workflow

export type CtaAction = "reach_out" | "nurture" | "watchlist" | "pass";
export type CtaStatus = "pending" | "agreed" | "actioned";
export type AppRole = "kol" | "team" | "admin";

export interface Cta {
  id: string;
  evaluation_id: string;
  artist_id: string;
  action: CtaAction;
  status: CtaStatus;
  note: string | null;
  created_by: string | null;
  agreed_by: string | null;
  actioned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
  role: AppRole;
}

// Events

export type EventType = "call" | "meeting" | "follow_up" | "showcase" | "other";

export interface ArtistEvent {
  id: string;
  artist_id: string;
  title: string;
  event_type: EventType;
  notes: string | null;
  scheduled_at: string;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Deals / commissions

export type DealStatus = "prospecting" | "negotiating" | "closed" | "passed";
export type PaymentType = "advance" | "royalty" | "milestone" | "other";

export interface Deal {
  id: string;
  artist_id: string;
  title: string;
  status: DealStatus;
  deal_value: number | null;
  commission_pct: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealPayment {
  id: string;
  deal_id: string;
  payment_type: PaymentType;
  amount: number;
  expected_date: string | null;
  received_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface DealSplit {
  id: string;
  deal_id: string;
  name: string;
  user_id: string | null;
  split_pct: number;
  created_at: string;
}

export interface DealWithLedger extends Deal {
  deal_payments: DealPayment[];
  deal_splits: DealSplit[];
}
