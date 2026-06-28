import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { DEFAULT_SCORING_CONFIG, SCORE_AXES } from "@/lib/config";
import type { ScoringConfig, ScoringWeights, TierBand } from "@/types";

export async function GET() {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("scoring_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return NextResponse.json({
      config: { id: 1, ...DEFAULT_SCORING_CONFIG, updated_at: new Date().toISOString() },
    });
  }

  return NextResponse.json({ config: data as ScoringConfig });
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();
  const body = (await request.json()) as {
    weights?: ScoringWeights;
    tier_bands?: TierBand[];
  };

  if (!body.weights || !body.tier_bands) {
    return NextResponse.json(
      { error: "weights and tier_bands are required" },
      { status: 400 }
    );
  }

  for (const axis of SCORE_AXES) {
    if (typeof body.weights[axis] !== "number") {
      return NextResponse.json(
        { error: `Missing weight for axis: ${axis}` },
        { status: 400 }
      );
    }
  }

  if (!Array.isArray(body.tier_bands) || body.tier_bands.length === 0) {
    return NextResponse.json({ error: "tier_bands must be a non-empty array" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("scoring_config")
    .upsert({
      id: 1,
      weights: body.weights,
      tier_bands: body.tier_bands,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: data as ScoringConfig });
}
