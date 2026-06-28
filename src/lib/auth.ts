import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, SessionUser } from "@/types";

export const AUTH_COOKIE = "tm-session";

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const supabase = getSupabaseServerClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    return {
      id: user.id,
      email: user.email ?? "",
      role: (roleRow?.role as AppRole) ?? "team",
    };
  } catch {
    return null;
  }
}
