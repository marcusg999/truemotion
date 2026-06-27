import { NextRequest, NextResponse } from "next/server";
import { runMdcExtraction } from "@/lib/pipeline/mdc";

export async function POST(request: NextRequest) {
  let body: { narrative?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const narrative = body?.narrative?.trim();
  if (!narrative) {
    return NextResponse.json({ error: "narrative is required" }, { status: 400 });
  }

  try {
    const result = await runMdcExtraction(narrative);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "MDC extraction failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
