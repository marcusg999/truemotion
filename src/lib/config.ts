import type { ScoringConfig, TierBand } from "@/types";

export const SCORE_AXES = [
  "craft",
  "traction",
  "culture_fit",
  "readiness",
  "strategic_fit",
] as const;

export const AXIS_LABELS: Record<string, string> = {
  craft: "Craft",
  traction: "Traction",
  culture_fit: "Culture Fit",
  readiness: "Readiness",
  strategic_fit: "Strategic Fit",
};

export const DEFAULT_WEIGHTS = {
  craft: 0.25,
  traction: 0.2,
  culture_fit: 0.2,
  readiness: 0.15,
  strategic_fit: 0.2,
};

export const DEFAULT_TIER_BANDS: TierBand[] = [
  { tier: "SIGN", min: 8.5, max: 10.0 },
  { tier: "NURTURE", min: 6.5, max: 8.499999 },
  { tier: "GUIDE", min: 4.5, max: 6.499999 },
  { tier: "NOT_READY", min: 2.5, max: 4.499999 },
  { tier: "PASS", min: 0, max: 2.499999 },
];

export const DEFAULT_SCORING_CONFIG: Omit<ScoringConfig, "id" | "updated_at"> = {
  weights: DEFAULT_WEIGHTS,
  tier_bands: DEFAULT_TIER_BANDS,
};

export const TIER_LABELS: Record<string, string> = {
  SIGN: "Sign",
  NURTURE: "Nurture",
  GUIDE: "Guide",
  NOT_READY: "Not Ready",
  PASS: "Pass",
};

export const TIER_DESCRIPTIONS: Record<string, string> = {
  SIGN: "Bring to TRP — composite 8.5-10.0",
  NURTURE: "Massive potential, develop the relationship — composite 6.5-8.4",
  GUIDE: "Has potential, needs guidance — composite 4.5-6.4",
  NOT_READY: "Track but don't engage yet — composite 2.5-4.4",
  PASS: "Not a fit / not an artist (internal label only) — composite 0.0-2.4",
};

export interface ArchetypeDefinition {
  name: string;
  reference: string;
  description: string;
}

export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    name: "Drill Insurgent",
    reference: "Chief Keef / Pop Smoke",
    description: "Raw regional street movements, energy over polish",
  },
  {
    name: "Martyr-Prophet",
    reference: "Tupac",
    description: "Thug-poet duality, emotional revolutionary, spiritual rage",
  },
  {
    name: "Griot",
    reference: "Nas",
    description:
      "Street poet, knowledge-of-self, cinematic realism (Biggie, Wu-Tang, Mobb Deep)",
  },
  {
    name: "Hustler-Mogul",
    reference: "Jay-Z",
    description:
      "Streets-to-boardroom, Black capitalism (50, Master P, Rick Ross, Diddy)",
  },
  {
    name: "Warrior",
    reference: "Ice Cube / N.W.A",
    description:
      "Gangsta, ghetto reportage, protest through aggression (The Game, Snoop)",
  },
  {
    name: "Cosmic Trickster",
    reference: "OutKast / André 3000",
    description: "Southern avant-garde, genre-bending (Tyler, Missy)",
  },
  {
    name: "Technical Assassin",
    reference: "Eminem",
    description:
      "Battle-rap purist, pure mechanics (Black Thought, Big Pun, Royce)",
  },
  {
    name: "Divine Feminine",
    reference: "Lauryn Hill",
    description:
      "Soul-conscious, spiritual depth (Erykah Badu, Rapsody, Jean Grae)",
  },
  {
    name: "Shapeshifter",
    reference: "Lil Wayne",
    description:
      "Punchline savant, melodic/auto-tune godfather, mentor figure",
  },
  {
    name: "Vulnerable Crossover",
    reference: "Drake",
    description: "Melodic, emo, pop-rap (Kid Cudi, Juice WRLD, melodic Future)",
  },
  {
    name: "Trap Architect",
    reference: "Gucci Mane",
    description: "Street economics, regional dominance (Jeezy, T.I., Future)",
  },
  {
    name: "Masked Mystic",
    reference: "MF DOOM",
    description: "Underground villain mythology, abstract, anti-celebrity",
  },
  {
    name: "Feminine Sovereign",
    reference: "Nicki / Megan",
    description:
      "Sex-positive, alter-ego theatrics, pop dominance (Lil Kim, Cardi)",
  },
];

export const CONFIDENCE_FIELDS: string[] = [
  "instagram_handle",
  "follower_count",
  "avg_engagement",
  "monthly_listeners",
  "release_count",
  "style_tags",
  "region",
  "niche",
  "affiliations",
  "lyrical_focus",
  "signed_status",
  "ig_url",
  "track_url",
  "epk_url",
  "notes",
];

export function resolveTier(composite: number, bands: TierBand[]): string {
  for (const band of bands) {
    if (composite >= band.min && composite <= band.max) {
      return band.tier;
    }
  }
  // Fallback: clamp to nearest band
  if (composite > bands[0].max) return bands[0].tier;
  return bands[bands.length - 1].tier;
}
