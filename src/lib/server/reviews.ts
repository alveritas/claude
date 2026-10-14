import { splitName } from "@/lib/shared/colorways";
import { mapReview, shortName, tallyReviews } from "@/lib/shared/reviews";
import type { RatingTally, Review } from "@/lib/shared/types";
import { siteUrl } from "./env";
import { getPublicSupabase, getServiceSupabase } from "./supabase";

/**
 * Review links. Every order gets a link signed with a secret only the server knows (made once and
 * kept in store_secrets), so only the buyer who received it can review what they bought.
 */
const SECRET_KEY = "review_link_secret";
let cachedSecret: string | null = null;

async function linkSecret(): Promise<string | null> {
  if (cachedSecret) return cachedSecret;
  const sb = getServiceSupabase();
  if (!sb) return null;
  const read = async () => (await sb.from("store_secrets").select("value").eq("key", SECRET_KEY).maybeSingle()).data?.value as string | undefined;
  let value = await read();
  if (!value) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const fresh = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await sb.from("store_secrets").insert({ key: SECRET_KEY, value: fresh });
    // Two requests at once: the other one's secret won, use that.
    value = error ? await read() : fresh;
  }
  return (cachedSecret = value ?? null);
}

/** HMAC-SHA256 of the order id, base64url. Web Crypto, so it runs on any host. */
export async function reviewToken(orderId: string): Promise<string | null> {
  const secret = await linkSecret();
  if (!secret) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`review:${orderId}`)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function verifyReviewToken(orderId: string, token: string | null | undefined): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const expected = await reviewToken(orderId);
  if (!expected) return false;
  // Constant-time comparison, so response timing gives nothing away.
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

export async function reviewUrl(orderId: string): Promise<string | null> {
  const t = await reviewToken(orderId);
  return t ? `${siteUrl()}/review/${orderId}?t=${t}` : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Orders that can be reviewed: paid and not refunded or cancelled. Test-mode orders can't. */
const REVIEWABLE = ["paid", "fulfilled", "shipped", "delivered"];

export interface ReviewableItem {
  id: string;
  name: string;
  size: string | null;
  colorway: string | null;
  productId: string | null;
  slug: string | null;
  image: string | null;
  reviewed: boolean;
}

export type ReviewableOrder =
  | { ok: { id: string; orderNumber: string; defaultName: string; items: ReviewableItem[] } }
  | { error: "invalid" | "unavailable" | "test" | "closed" };

/** Everything the review page needs, after checking the link. */
export async function loadReviewableOrder(orderId: string, token: string | null | undefined): Promise<ReviewableOrder> {
  const sb = getServiceSupabase();
  if (!sb) return { error: "unavailable" };
  if (!UUID.test(orderId) || !(await verifyReviewToken(orderId, token))) return { error: "invalid" };
  const { data: order } = await sb
    .from("orders")
    .select("id, order_number, status, livemode, shipping_name")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "invalid" };
  if (order.livemode === false) return { error: "test" };
  if (!REVIEWABLE.includes(order.status)) return { error: "closed" };
  const [{ data: items }, { data: done }] = await Promise.all([
    sb.from("order_items").select("id, name, size, color, product_id").eq("order_id", orderId),
    sb.from("reviews").select("order_item_id").eq("order_id", orderId),
  ]);
  const productIds = [...new Set((items ?? []).map((i) => i.product_id).filter(Boolean))] as string[];
  const { data: products } = productIds.length
    ? await sb.from("products").select("id, slug, product_images(url, sort_order)").in("id", productIds)
    : { data: [] as { id: string; slug: string; product_images: { url: string; sort_order: number }[] }[] };
  const reviewed = new Set((done ?? []).map((d) => d.order_item_id));
  return {
    ok: {
      id: order.id,
      orderNumber: order.order_number,
      defaultName: shortName(order.shipping_name),
      items: (items ?? []).map((i) => {
        const p = (products ?? []).find((x) => x.id === i.product_id);
        const img = [...(p?.product_images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
        return {
          id: i.id,
          name: i.name,
          size: i.size ?? null,
          colorway: splitName(i.name).colorway ?? i.color ?? null,
          productId: i.product_id ?? null,
          slug: p?.slug ?? null,
          image: img?.url ?? null,
          reviewed: reviewed.has(i.id),
        };
      }),
    },
  };
}

const REVIEW_COLUMNS = "id, product_id, rating, title, body, author, size, color, fit, created_at";

/**
 * Star totals per product for the cards and pages. If the reviews table isn't there yet (the
 * database hasn't been updated), the store still loads, just without stars.
 */
export async function getRatingTallies(): Promise<Record<string, RatingTally>> {
  const sb = getPublicSupabase();
  if (!sb) return {};
  const { data, error } = await sb.from("reviews").select("product_id, rating, fit").eq("status", "published").limit(5000);
  if (error) return {};
  return tallyReviews(data ?? []);
}

/** Published reviews for these products (one piece's colours), newest first. */
export async function getReviewsFor(productIds: string[]): Promise<Review[]> {
  const sb = getPublicSupabase();
  if (!sb || !productIds.length) return [];
  const { data, error } = await sb
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .eq("status", "published")
    .in("product_id", productIds)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];
  return (data ?? []).map(mapReview);
}
