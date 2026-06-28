import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let name: string, split_pct: number;

  try {
    const body = await request.json();
    name = body.name?.trim();
    split_pct = Number(body.split_pct);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (isNaN(split_pct) || split_pct < 0 || split_pct > 100) {
    return NextResponse.json({ error: "split_pct must be 0-100" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("deal_splits")
    .insert({ deal_id: id, name, split_pct })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ split: data }, { status: 201 });
}
