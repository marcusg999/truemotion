import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { InviteUserSchema } from "@/lib/validation";

export async function GET() {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();

  // List all users from user_roles with their emails from auth.users via admin API
  const { data: roleRows, error } = await supabase
    .from("user_roles")
    .select("user_id, role");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (roleRows ?? []).map((r: { user_id: string }) => r.user_id);
  const users: Array<{ id: string; email: string; role: string }> = [];

  for (const uid of userIds) {
    const { data: { user } } = await supabase.auth.admin.getUserById(uid);
    const roleRow = (roleRows ?? []).find((r: { user_id: string }) => r.user_id === uid);
    if (user) {
      users.push({ id: uid, email: user.email ?? "", role: roleRow?.role ?? "team" });
    }
  }

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = InviteUserSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { email, role } = parsed.data;
  const supabase = getSupabaseServerClient();

  // Create the user via Supabase admin API with a temporary password (they can reset)
  const { data: created, error: createError } = await supabase.auth.admin.inviteUserByEmail(email);

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to invite user" },
      { status: 500 }
    );
  }

  // Upsert their role
  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: created.user.id, role }, { onConflict: "user_id" });

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }

  // Track in invites log
  await supabase.from("user_invites").upsert(
    { email, role, invited_by: admin.id },
    { onConflict: "email" }
  );

  return NextResponse.json(
    { user: { id: created.user.id, email, role } },
    { status: 201 }
  );
}
