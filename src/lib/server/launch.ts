import { isPrelaunchAnnouncement, LAUNCH } from "@/data/launch";
import { activeProvider, paymentMode } from "./payments";
import { getServiceSupabase } from "./supabase";

let done = false;

/** Live payments are connected, so it's safe to open the store: customers can actually pay. */
export const readyToLaunch = () => Boolean(activeProvider()) && paymentMode() === "live";

/**
 * Opens Drop 001 for sale in the database the first time the site runs with live payments:
 * every size still at 0 gets 150, Coming soon pieces with a price go on sale, the contact email
 * is filled in if empty, shipping zones switch on and the store goes live. A marker in
 * store_secrets makes it happen once, so later admin changes (a size set to 0, the store
 * paused) are never undone.
 */
export async function ensureLaunched(): Promise<boolean> {
  if (done) return true;
  if (!readyToLaunch()) return false;
  const sb = getServiceSupabase();
  if (!sb) return false;
  const { data: mark } = await sb.from("store_secrets").select("key").eq("key", LAUNCH.marker).maybeSingle();
  if (mark) return (done = true);

  const { data: products, error: pErr } = await sb.from("products").select("id, status, price_cents");
  if (pErr) return false;
  const listed = (products ?? []).filter((p) => p.status === "coming_soon" || p.status === "available");
  const ids = listed.map((p) => p.id as string);
  if (ids.length) {
    await sb.from("product_variants").update({ stock: LAUNCH.stockPerSize }).eq("stock", 0).in("product_id", ids);
  }
  const toSell = listed.filter((p) => p.status === "coming_soon" && p.price_cents != null).map((p) => p.id as string);
  if (toSell.length) await sb.from("products").update({ status: "available" }).in("id", toSell);

  const { data: s } = await sb.from("store_settings").select("contact_email, announcement").eq("id", 1).maybeSingle();
  await sb
    .from("store_settings")
    .update({
      mode: "live",
      ...(s?.contact_email?.trim() ? {} : { contact_email: LAUNCH.contactEmail }),
      ...(isPrelaunchAnnouncement(s?.announcement) ? { announcement: LAUNCH.announcement } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  await sb.from("shipping_zones").update({ is_active: true }).eq("is_active", false);

  const { error } = await sb.from("store_secrets").insert({ key: LAUNCH.marker, value: new Date().toISOString() });
  if (error && error.code !== "23505") return false;
  return (done = true);
}
