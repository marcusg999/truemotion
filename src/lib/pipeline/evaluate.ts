import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_SCORING_CONFIG } from "@/lib/config";
import { runScoringPipeline } from "@/lib/pipeline/scoring";
import { runMdcExtraction } from "@/lib/pipeline/mdc";
import { computeMatch } from "@/lib/pipeline/matching";
import { getTrpMasterProfile, getReferenceProfile } from "@/lib/data";
import type { Artist, MatchChecklistItem, MdcEntry, ReferenceProfile, ScoringConfig } from "@/types";
import type { MatchContext } from "@/lib/pipeline/scoring";

export async function runEvaluationForArtist(
  artistId: string,
  referenceProfileId?: string | null
): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .select("*")
    .eq("id", artistId)
    .single();

  if (artistError || !artist) throw new Error("Artist not found");

  const { data: configRow } = await supabase
    .from("scoring_config")
    .select("*")
    .eq("id", 1)
    .single();

  const config: ScoringConfig = (configRow as ScoringConfig) ?? {
    id: 1,
    ...DEFAULT_SCORING_CONFIG,
    updated_at: new Date().toISOString(),
  };

  let referenceProfile: ReferenceProfile | null = null;
  if (referenceProfileId) {
    referenceProfile = await getReferenceProfile(referenceProfileId);
  }
  if (!referenceProfile) {
    referenceProfile = await getTrpMasterProfile();
  }

  let matchContext: MatchContext | undefined;
  let artistMdc: MdcEntry[] = (artist as Artist).mdc ?? [];
  let computedMatchScore: number | null = null;
  let computedChecklist: MatchChecklistItem[] = [];

  if (referenceProfile) {
    if (artistMdc.length === 0 && (artist as Artist).narrative) {
      try {
        const { normalized } = await runMdcExtraction((artist as Artist).narrative!);
        artistMdc = normalized;
      } catch {
        // silent — proceed without MDC
      }
    }

    const referenceMdc = referenceProfile.mdc ?? [];
    if (artistMdc.length > 0 && referenceMdc.length > 0) {
      const matchResult = computeMatch(referenceMdc, artistMdc);
      computedMatchScore = matchResult.match_score;
      computedChecklist = matchResult.checklist;
      matchContext = {
        matchScore: matchResult.match_score,
        checklist: matchResult.checklist,
        profileName: referenceProfile.name,
        profileNarrative: referenceProfile.narrative ?? "",
      };
    }
  }

  const result = await runScoringPipeline(artist as Artist, config, matchContext);

  const record = {
    artist_id: artistId,
    craft_score: result.axisResults.craft.score,
    craft_rationale: result.axisResults.craft.rationale,
    traction_score: result.axisResults.traction.score,
    traction_rationale: result.axisResults.traction.rationale,
    culture_fit_score: result.axisResults.culture_fit.score,
    culture_fit_rationale: result.axisResults.culture_fit.rationale,
    readiness_score: result.axisResults.readiness.score,
    readiness_rationale: result.axisResults.readiness.rationale,
    strategic_fit_score: result.axisResults.strategic_fit.score,
    strategic_fit_rationale: result.axisResults.strategic_fit.rationale,
    composite_score: result.compositeScore,
    confidence_score: result.confidenceScore,
    tier: result.tier,
    archetype_blend: result.archetypeBlend,
    archetype_justification: result.archetypeJustification,
    growth_path: result.growthPath,
    weights_used: config.weights,
    missing_fields: result.missingFields,
    reference_profile_id: referenceProfile?.id ?? null,
    match_score: computedMatchScore,
    match_checklist: computedChecklist,
  };

  const { error: insertError } = await supabase.from("evaluations").insert(record);
  if (insertError) throw new Error(insertError.message);
}
