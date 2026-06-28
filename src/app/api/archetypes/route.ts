import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import type { Archetype } from "@/types";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("archetypes")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ archetypes: data as Archetype[] });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let name: string, reference: string, description: string, display_order: number;
  try {
    const body = await request.json();
    name = body.name?.trim();
    reference = body.reference?.trim() ?? "";
    description = body.description?.trim() ?? "";
    display_order = typeof body.display_order === "number" ? body.display_order : 999;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("archetypes")
    .insert({ name, reference, description, display_order })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create archetype" }, { status: 500 });
  }

  return NextResponse.json({ archetype: data as Archetype }, { status: 201 });
}
