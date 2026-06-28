import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import type { EventType } from "@/types";

const VALID_TYPES: EventType[] = ["call", "meeting", "follow_up", "showcase", "other"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("artist_id", id)
    .order("scheduled_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const sessionUser = token ? await verifyToken(token) : null;

  let title: string, event_type: EventType, scheduled_at: string, notes: string | undefined;
  try {
    const body = await request.json();
    title = body.title?.trim();
    event_type = body.event_type ?? "call";
    scheduled_at = body.scheduled_at;
    notes = body.notes?.trim() || undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!scheduled_at) return NextResponse.json({ error: "scheduled_at required" }, { status: 400 });
  if (!VALID_TYPES.includes(event_type)) return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ artist_id: id, title, event_type, scheduled_at, notes: notes ?? null, created_by: sessionUser?.id ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data }, { status: 201 });
}
