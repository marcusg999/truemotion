import { NextRequest, NextResponse } from "next/server";
import { listReferenceProfiles, createReferenceProfile } from "@/lib/data";
import type { ReferenceProfileInput } from "@/types";

export async function GET() {
  try {
    const profiles = await listReferenceProfiles();
    return NextResponse.json({ profiles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load profiles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Partial<ReferenceProfileInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.type || !["master", "archetype", "campaign"].includes(body.type)) {
    return NextResponse.json({ error: "type must be master, archetype, or campaign" }, { status: 400 });
  }

  try {
    const profile = await createReferenceProfile({
      name: body.name.trim(),
      type: body.type,
      narrative: body.narrative?.trim() ?? null,
      mdc: body.mdc ?? [],
    });
    return NextResponse.json({ profile }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
