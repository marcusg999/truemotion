import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_SCORING_CONFIG } from "@/lib/config";
import { runScoringPipeline } from "@/lib/pipeline/scoring";
import type { Artist, Evaluation, ScoringConfig } from "@/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  let result;
  try {
    result = await runScoringPipeline(artist as Artist, config);
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
