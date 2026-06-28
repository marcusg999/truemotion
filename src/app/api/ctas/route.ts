import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("ctas")
    .select(`
      *,
      artists ( id, name, region, instagram_handle ),
      evaluations ( id, tier, composite_score, created_at )
    `)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ctas: data ?? [] });
}
