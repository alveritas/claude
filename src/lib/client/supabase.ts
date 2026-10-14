"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/** Browser client for auth flows. Returns null when Supabase isn't configured yet. */
export function getBrowserSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  // NH_* are resolved from whichever Supabase variable names the host provides (next.config.ts).
  const url = process.env.NH_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NH_SUPABASE_PUBLIC_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createBrowserClient(url, key) : null;
  return client;
}
