import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { env } from "./env";
import { getServerSupabase, getServiceSupabase } from "./supabase";

export async function getSessionUser(): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  // getUser() validates the JWT with Supabase Auth; never trust getSession() on the server.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}

export async function isAdminUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "admin";
}

/**
 * The owner's account becomes the admin by itself: if ADMIN_EMAIL is set and this signed-in
 * user's address matches and has been confirmed, the role is granted with the service key.
 * (Nothing a visitor sends can trigger this; only the server-side env value counts.)
 */
async function claimOwnerAdmin(user: User): Promise<boolean> {
  const confirmed = Boolean((user as User & { email_confirmed_at?: string | null }).email_confirmed_at);
  if (!env.adminEmail || !confirmed || user.email?.toLowerCase() !== env.adminEmail) return false;
  const sb = getServiceSupabase();
  if (!sb) return false;
  const { error } = await sb.from("profiles").update({ role: "admin" }).eq("id", user.id);
  return !error;
}

/** Guards every admin page and server action. Redirects instead of rendering anything. */
export async function requireAdmin(): Promise<{ supabase: SupabaseClient; user: User }> {
  const session = await getSessionUser();
  if (!session) redirect("/account/login?next=/admin");
  if (!(await isAdminUser(session.supabase, session.user.id)) && !(await claimOwnerAdmin(session.user))) redirect("/");
  return session;
}

export async function requireUser(next: string): Promise<{ supabase: SupabaseClient; user: User }> {
  const session = await getSessionUser();
  if (!session) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return session;
}
