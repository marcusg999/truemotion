import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { runOutreachPipeline } from "@/lib/pipeline/outreach";
import type { Artist, Evaluation, MessageDraft } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();

  let force = false;
  try {
    const body = await request.json();
    force = Boolean(body?.force);
  } catch {
    // no body provided, default to force=false
  }

  const { data: evaluation, error: evalError } = await supabase
    .from("evaluations")
    .select("*")
    .eq("id", id)
    .single();

  if (evalError || !evaluation) {
    return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
  }

  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .select("*")
    .eq("id", (evaluation as Evaluation).artist_id)
    .single();

  if (artistError || !artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  let drafts;
  try {
    drafts = await runOutreachPipeline(artist as Artist, evaluation as Evaluation, {
      force,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Outreach pipeline failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (drafts.length === 0) {
    return NextResponse.json({ messageDrafts: [] as MessageDraft[] }, { status: 201 });
  }

  const records = drafts.map((draft) => ({
    evaluation_id: id,
    artist_id: (evaluation as Evaluation).artist_id,
    tone: draft.tone,
    content: draft.content,
    status: "draft" as const,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("message_drafts")
    .insert(records)
    .select();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(
    { messageDrafts: inserted as MessageDraft[] },
    { status: 201 }
  );
}
