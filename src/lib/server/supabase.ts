import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, hasServiceRole, hasSupabase } from "./env";

/** Session-aware client for the signed-in visitor. Row Level Security applies. */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!hasSupabase()) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: middleware refreshes the session instead.
        }
      },
    },
  });
}

/** Cookie-free anonymous client for public catalogue reads (cacheable). RLS applies. */
export function getPublicSupabase(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  return createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service-role client. Bypasses RLS — only for trusted server code paths
 * (Stripe webhook, newsletter insert, admin actions after requireAdmin()).
 */
export function getServiceSupabase(): SupabaseClient | null {
  if (!hasServiceRole()) return null;
  return createClient(env.supabaseUrl!, env.supabaseServiceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
