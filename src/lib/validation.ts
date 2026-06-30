import { z } from "zod";

export const SubmitSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required"),
  instagram_handle: z.string().max(60).optional().nullable(),
  region: z.string().max(80).optional().nullable(),
  style_tags: z.array(z.string().max(40)).max(10).default([]),
  track_url: z.string().url("track_url must be a valid URL").max(500).optional().nullable(),
  narrative: z.string().max(5000, "Narrative must be 5000 characters or less").optional().nullable(),
  turnstile_token: z.string().optional(),
});

export const ArtistInputSchema = z.object({
  name: z.string().min(1).max(120),
  alias: z.string().max(120).optional().nullable(),
  email: z.string().email().optional().nullable(),
  instagram_handle: z.string().max(60).optional().nullable(),
  region: z.string().max(80).optional().nullable(),
  style_tags: z.array(z.string().max(40)).max(10).default([]),
  niche: z.string().max(200).optional().nullable(),
  affiliations: z.string().max(500).optional().nullable(),
  lyrical_focus: z.string().max(500).optional().nullable(),
  signed_status: z.enum(["independent", "signed", "unknown"]).default("unknown"),
  follower_count: z.number().int().nonnegative().optional().nullable(),
  avg_engagement: z.number().nonnegative().optional().nullable(),
  monthly_listeners: z.number().int().nonnegative().optional().nullable(),
  release_count: z.number().int().nonnegative().optional().nullable(),
  ig_url: z.string().url().max(500).optional().nullable(),
  track_url: z.string().url().max(500).optional().nullable(),
  epk_url: z.string().url().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  narrative: z.string().max(5000).optional().nullable(),
  source: z.enum(["manual", "submission"]).default("manual"),
  mdc: z.array(z.object({
    category: z.enum(["genre", "region", "theme", "adjective", "affiliation", "intelligence"]),
    term: z.string(),
    weight: z.number(),
  })).default([]),
});

export const DealInputSchema = z.object({
  title: z.string().min(1).max(200),
  status: z.enum(["prospecting", "negotiating", "closed", "passed"]).default("prospecting"),
  deal_value: z.number().nonnegative().optional().nullable(),
  commission_pct: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const InviteUserSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "team", "kol"]),
});

export const UpdateUserRoleSchema = z.object({
  role: z.enum(["admin", "team", "kol"]),
});
