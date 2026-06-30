import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import type { CtaAction, CtaStatus } from "@/types";

const VALID_ACTIONS: CtaAction[] = ["reach_out", "nurture", "watchlist", "pass"];
const VALID_STATUSES: CtaStatus[] = ["pending", "agreed", "actioned"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("ctas")
    .select("*")
    .eq("evaluation_id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cta: data ?? null });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let action: CtaAction, note: string | undefined, artistId: string;
  try {
    const body = await request.json();
    action = body.action;
    note = body.note;
    artistId = body.artist_id;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (!artistId) {
    return NextResponse.json({ error: "artist_id required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("ctas")
    .upsert(
      {
        evaluation_id: id,
        artist_id: artistId,
        action,
        status: "pending",
        note: note ?? null,
        created_by: sessionUser?.id ?? null,
        agreed_by: null,
        actioned_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "evaluation_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data) {
    await supabase.from("cta_audit_log").insert({
      cta_id: data.id,
      action_type: "created",
      actor_id: sessionUser?.id ?? null,
      note: `Action: ${action}`,
    });
  }

  return NextResponse.json({ cta: data }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let status: CtaStatus, note: string | undefined;
  try {
    const body = await request.json();
    status = body.status;
    note = body.note;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (status === "agreed" && sessionUser?.role === "kol") {
    return NextResponse.json({ error: "KOL role cannot agree CTAs" }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "agreed") updates.agreed_by = sessionUser?.id ?? null;
  if (status === "actioned") updates.actioned_at = new Date().toISOString();
  if (note !== undefined) updates.note = note;

  const { data, error } = await supabase
    .from("ctas")
    .update(updates)
    .eq("evaluation_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data) {
    await supabase.from("cta_audit_log").insert({
      cta_id: data.id,
      action_type: status,
      actor_id: sessionUser?.id ?? null,
      note: note ?? null,
    });
  }

  return NextResponse.json({ cta: data });
}
