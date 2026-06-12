import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { MessageDraft, MessageStatus } from "@/types";

const VALID_STATUSES: MessageStatus[] = ["draft", "approved", "edited", "archived"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const body = (await request.json()) as {
    content?: string;
    status?: MessageStatus;
  };

  const updates: Record<string, unknown> = {};

  if (typeof body.content === "string") {
    updates.content = body.content;
    if (!body.status) {
      updates.status = "edited";
    }
  }

  if (body.status) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
    if (body.status === "approved") {
      updates.approved_at = new Date().toISOString();
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("message_drafts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messageDraft: data as MessageDraft });
}
