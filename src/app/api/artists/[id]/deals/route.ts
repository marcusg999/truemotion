import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*, deal_payments (*), deal_splits (*)")
    .eq("artist_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deals: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const sessionUser = token ? await verifyToken(token) : null;

  let title: string, status: string, deal_value: number | null, commission_pct: number | null, notes: string | undefined;
  try {
    const body = await request.json();
    title = body.title?.trim();
    status = body.status ?? "prospecting";
    deal_value = body.deal_value != null ? Number(body.deal_value) : null;
    commission_pct = body.commission_pct != null ? Number(body.commission_pct) : null;
    notes = body.notes?.trim() || undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .insert({
      artist_id: id,
      title,
      status,
      deal_value: deal_value ?? null,
      commission_pct: commission_pct ?? null,
      notes: notes ?? null,
      created_by: sessionUser?.id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: data }, { status: 201 });
}
