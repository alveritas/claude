import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeContent } from "@/lib/shared/content";
import { mapProduct, mapSettings, mapZone, PRODUCT_SELECT } from "./catalog";

/** Admin reads go through the signed-in admin's client; RLS grants admins full visibility. */
export async function adminProducts(sb: SupabaseClient) {
  const { data, error } = await sb.from("products").select(PRODUCT_SELECT).order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProduct);
}

export async function adminSettings(sb: SupabaseClient) {
  const { data } = await sb.from("store_settings").select("*").eq("id", 1).maybeSingle();
  return mapSettings(data);
}

export async function adminZones(sb: SupabaseClient) {
  const { data } = await sb.from("shipping_zones").select("*").order("sort_order");
  return (data ?? []).map(mapZone);
}

export async function adminContent(sb: SupabaseClient) {
  const { data } = await sb.from("site_content").select("key, value");
  return { merged: mergeContent(data), stored: new Map<string, string>((data ?? []).map((r): [string, string] => [r.key, r.value])) };
}

export async function adminCollections(sb: SupabaseClient) {
  const { data } = await sb.from("collections").select("*").order("sort_order");
  return data ?? [];
}

