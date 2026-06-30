import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: job, error } = await supabase
    .from("evaluation_jobs")
    .select("id, status, error, result_evaluation_id, kind, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "done" && job.result_evaluation_id) {
    const { data: evaluation } = await supabase
      .from("evaluations")
      .select("*")
      .eq("id", job.result_evaluation_id)
      .single();

    return NextResponse.json({ job, evaluation: evaluation ?? null });
  }

  return NextResponse.json({ job, evaluation: null });
}
