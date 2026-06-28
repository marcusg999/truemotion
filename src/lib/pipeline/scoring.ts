import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { ARCHETYPES, AXIS_LABELS, SCORE_AXES, resolveTier } from "@/lib/config";
import { computeConfidence } from "@/lib/pipeline/confidence";
import type {
  Archetype,
  Artist,
  ArchetypeBlendEntry,
  AxisResult,
  MatchChecklistItem,
  ScoringConfig,
  Tier,
} from "@/types";

export interface MatchContext {
  matchScore: number;
  checklist: MatchChecklistItem[];
  profileName: string;
  profileNarrative: string;
}

export interface ScoringResult {
  axisResults: Record<(typeof SCORE_AXES)[number], AxisResult>;
  compositeScore: number;
  confidenceScore: number;
  missingFields: string[];
  tier: Tier;
  archetypeBlend: ArchetypeBlendEntry[];
  archetypeJustification: string;
  growthPath: string[];
}

function buildAxisRubric(matchContext?: MatchContext): string {
  const cultureFitLine = matchContext
    ? `- Culture Fit: alignment with ${matchContext.profileName}.
  Profile summary: ${matchContext.profileNarrative.slice(0, 300)}...
  MDC match score: ${matchContext.matchScore}/10.
  MDC checklist (reference terms): ${
    matchContext.checklist
      .filter((c) => c.in_source_1)
      .map((c) => `${c.term} [${c.status}]`)
      .join(", ") || "none"
  }.
  Use the match checklist as your primary anchor for Culture Fit. A high match score
  means the artist's narrative aligns closely; low means misalignment. Adjust score
  accordingly, but do not ignore evidence from the artist profile itself.`
    : `- Culture Fit: alignment with TRP's identity and mission (TRP is an
  infrastructure platform for the hip-hop economy — intelligent, culturally
  grounded, forward-looking, curated; "Wired for hip-hop" tone, not gossip
  or hype-only content).`;

  const strategicFitLine = matchContext
    ? `- Strategic Fit: does TRP specifically need/benefit from this artist right
  now (gap-fill, roster balance, availability)? MDC match score of ${matchContext.matchScore}/10
  is a prior — a strong match suggests strategic alignment; a weak match suggests a gap
  that may or may not be worth bridging.`
    : `- Strategic Fit: does TRP specifically need/benefit from this artist right
  now (gap-fill, roster balance, availability)?`;

  return `
Score these five axes from 0-10 (one decimal place), each with a single
sentence rationale grounded in the data provided. Be honest about thin data:
do not invent specifics that were not given.

- Craft: skill, originality, vocal/lyrical quality.
- Traction: audience size, engagement quality, momentum.
${cultureFitLine}
- Readiness: professionalism, consistency, catalog depth.
${strategicFitLine}

Do not let archetype lane (e.g. gender, region, sub-genre) structurally
penalize Craft or Traction. Score what is actually evidenced.
`.trim();
}

function buildArchetypeRubric(archetypes: Archetype[]): string {
  const list = archetypes.length > 0 ? archetypes : ARCHETYPES;
  return list.map((a) => `- ${a.name} (${a.reference}): ${a.description}`).join("\n");
}

function buildArtistProfile(artist: Partial<Artist>, missingFields: string[]): string {
  const lines: string[] = [];
  lines.push(`Name: ${artist.name ?? "Unknown"}`);
  if (artist.alias) lines.push(`Alias: ${artist.alias}`);
  if (artist.instagram_handle) lines.push(`Instagram: @${artist.instagram_handle}`);
  if (artist.region) lines.push(`Region: ${artist.region}`);
  if (artist.style_tags?.length) lines.push(`Style tags: ${artist.style_tags.join(", ")}`);
  if (artist.niche) lines.push(`Niche: ${artist.niche}`);
  if (artist.affiliations) lines.push(`Affiliations / cosigns: ${artist.affiliations}`);
  if (artist.lyrical_focus) lines.push(`Lyrical focus: ${artist.lyrical_focus}`);
  if (artist.signed_status) lines.push(`Signed status: ${artist.signed_status}`);
  if (artist.follower_count != null) lines.push(`Follower count: ${artist.follower_count}`);
  if (artist.avg_engagement != null) lines.push(`Average engagement rate: ${artist.avg_engagement}`);
  if (artist.monthly_listeners != null) lines.push(`Monthly listeners: ${artist.monthly_listeners}`);
  if (artist.release_count != null) lines.push(`Release count: ${artist.release_count}`);
  if (artist.ig_url) lines.push(`Instagram URL: ${artist.ig_url}`);
  if (artist.track_url) lines.push(`Track URL: ${artist.track_url}`);
  if (artist.epk_url) lines.push(`EPK URL: ${artist.epk_url}`);
  if (artist.notes) lines.push(`Scout notes: ${artist.notes}`);
  if (artist.narrative) lines.push(`Artist narrative: ${artist.narrative.slice(0, 600)}`);

  if (missingFields.length) {
    lines.push("");
    lines.push(`Missing / unknown fields: ${missingFields.join(", ")}`);
  }

  return lines.join("\n");
}

const EVALUATION_TOOL = {
  name: "submit_evaluation",
  description:
    "Submit the structured multi-axis A&R evaluation, archetype blend, and growth path for this artist.",
  input_schema: {
    type: "object" as const,
    properties: {
      axis_scores: {
        type: "object",
        description: "Score (0-10, one decimal) and one-line rationale per axis.",
        properties: Object.fromEntries(
          SCORE_AXES.map((axis) => [
            axis,
            {
              type: "object",
              properties: {
                score: { type: "number", minimum: 0, maximum: 10 },
                rationale: { type: "string" },
              },
              required: ["score", "rationale"],
            },
          ])
        ),
        required: [...SCORE_AXES],
      },
      archetype_blend: {
        type: "array",
        description:
          "Blend of TRP archetypes that best describe this artist's style, with percentages summing to 100.",
        items: {
          type: "object",
          properties: {
            archetype: { type: "string" },
            percentage: { type: "number", minimum: 0, maximum: 100 },
          },
          required: ["archetype", "percentage"],
        },
      },
      archetype_justification: {
        type: "string",
        description: "1-2 sentence justification for the archetype blend.",
      },
      growth_path: {
        type: "array",
        description:
          "2-4 concrete, actionable steps that would raise this artist's composite score. Empty array if not applicable (e.g. SIGN or PASS tiers).",
        items: { type: "string" },
      },
    },
    required: [
      "axis_scores",
      "archetype_blend",
      "archetype_justification",
      "growth_path",
    ],
  },
};

export async function runScoringPipeline(
  artist: Partial<Artist>,
  config: ScoringConfig,
  matchContext?: MatchContext,
  archetypes: Archetype[] = []
): Promise<ScoringResult> {
  const { confidence, missingFields } = computeConfidence(artist);

  const prompt = `
You are an A&R evaluator for TRP.L (The Rap Project Label), a technology
platform and infrastructure layer for the hip-hop economy. Evaluate the
following artist using the rubric and archetype list below, then call the
submit_evaluation tool with your results.

${buildAxisRubric(matchContext)}

TRP archetype reference (return a blend, never force a single bucket):
${buildArchetypeRubric(archetypes)}

Artist profile:
${buildArtistProfile(artist, missingFields)}

Confidence in this profile (based on field completeness): ${confidence}%.
If confidence is low, keep scores conservative and say so in rationales
where relevant.

For growth_path: only populate it with meaningful, concrete steps if the
artist looks like a GUIDE or NURTURE candidate (roughly composite 4.5-8.4).
For very high (SIGN) or very low (PASS) profiles, return an empty array.
`.trim();

  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    tools: [EVALUATION_TOOL],
    tool_choice: { type: "tool", name: "submit_evaluation" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a submit_evaluation tool call");
  }

  const input = toolUse.input as {
    axis_scores: Record<string, { score: number; rationale: string }>;
    archetype_blend: ArchetypeBlendEntry[];
    archetype_justification: string;
    growth_path: string[];
  };

  const axisResults = {} as Record<(typeof SCORE_AXES)[number], AxisResult>;
  for (const axis of SCORE_AXES) {
    const result = input.axis_scores[axis];
    if (!result) {
      throw new Error(`Missing axis score for ${AXIS_LABELS[axis]}`);
    }
    axisResults[axis] = {
      score: clampScore(result.score),
      rationale: result.rationale,
    };
  }

  const compositeScore = computeComposite(axisResults, config.weights);
  const tier = resolveTier(compositeScore, config.tier_bands) as Tier;

  return {
    axisResults,
    compositeScore,
    confidenceScore: confidence,
    missingFields,
    tier,
    archetypeBlend: input.archetype_blend ?? [],
    archetypeJustification: input.archetype_justification ?? "",
    growthPath: input.growth_path ?? [],
  };
}

function clampScore(score: number): number {
  return Math.round(Math.min(10, Math.max(0, score)) * 10) / 10;
}

function computeComposite(
  axisResults: Record<(typeof SCORE_AXES)[number], AxisResult>,
  weights: ScoringConfig["weights"]
): number {
  let total = 0;
  let weightSum = 0;

  for (const axis of SCORE_AXES) {
    const weight = weights[axis] ?? 0;
    total += axisResults[axis].score * weight;
    weightSum += weight;
  }

  const normalized = weightSum > 0 ? total / weightSum : 0;
  return Math.round(normalized * 10) / 10;
}
