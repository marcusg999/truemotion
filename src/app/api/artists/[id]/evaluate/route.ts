import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runEvaluationForArtist } from "@/lib/pipeline/evaluate";
import type { Evaluation } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let requestedProfileId: string | null = null;
  try {
    const body = await request.json();
    requestedProfileId = body?.reference_profile_id ?? null;
  } catch {
    // no body — fine
  }

  const supabase = getSupabaseServerClient();
  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .select("id")
    .eq("id", id)
    .single();

  if (artistError || !artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  try {
    await runEvaluationForArtist(id, requestedProfileId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring pipeline failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data: evaluation, error: fetchError } = await supabase
    .from("evaluations")
    .select("*")
    .eq("artist_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ evaluation: evaluation as Evaluation }, { status: 201 });
}
