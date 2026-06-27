import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_SCORING_CONFIG } from "@/lib/config";
import { runScoringPipeline } from "@/lib/pipeline/scoring";
import { runMdcExtraction } from "@/lib/pipeline/mdc";
import { computeMatch } from "@/lib/pipeline/matching";
import { getTrpMasterProfile, getReferenceProfile } from "@/lib/data";
import type { Artist, Evaluation, MatchChecklistItem, MdcEntry, ReferenceProfile, ScoringConfig } from "@/types";
import type { MatchContext } from "@/lib/pipeline/scoring";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  // Parse optional reference_profile_id from request body (body is always optional)
  let requestedProfileId: string | null = null;
  try {
    const body = await request.json();
    requestedProfileId = body?.reference_profile_id ?? null;
  } catch {
    // no body or non-JSON body — fine, proceed with defaults
  }

  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .select("*")
    .eq("id", id)
    .single();

  if (artistError || !artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  const { data: configRow, error: configError } = await supabase
    .from("scoring_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (configError) {
    return NextResponse.json({ error: configError.message }, { status: 500 });
  }

  const config: ScoringConfig = (configRow as ScoringConfig) ?? {
    id: 1,
    ...DEFAULT_SCORING_CONFIG,
    updated_at: new Date().toISOString(),
  };

  // Resolve reference profile (requested → master fallback → null)
  let referenceProfile: ReferenceProfile | null = null;
  if (requestedProfileId) {
    referenceProfile = await getReferenceProfile(requestedProfileId);
  }
  if (!referenceProfile) {
    referenceProfile = await getTrpMasterProfile();
  }

  // Build match context if we have both a reference profile and artist narrative/MDC
  let matchContext: MatchContext | undefined;
  let artistMdc: MdcEntry[] = (artist as Artist).mdc ?? [];
  let computedMatchScore: number | null = null;
  let computedChecklist: MatchChecklistItem[] = [];

  if (referenceProfile) {
    // Extract artist MDC from narrative if not already stored
    if (artistMdc.length === 0 && (artist as Artist).narrative) {
      try {
        const { normalized } = await runMdcExtraction((artist as Artist).narrative!);
        artistMdc = normalized;
      } catch {
        // MDC extraction failed — proceed without it; don't block scoring
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

  let result;
  try {
    result = await runScoringPipeline(artist as Artist, config, matchContext);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring pipeline failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const record = {
    artist_id: id,
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

  const { data: evaluation, error: insertError } = await supabase
    .from("evaluations")
    .insert(record)
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ evaluation: evaluation as Evaluation }, { status: 201 });
}
