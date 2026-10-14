/**
 * Square payments. Customers pay on Square's own hosted checkout page (card, Apple Pay, Google
 * Pay, Cash App Pay), so card details never touch this site. Paid orders reach the store three
 * ways, all idempotent: Square's signed webhook, the buyer returning to the confirmation page,
 * and a catch-up sync when the admin opens Orders.
 */
import { env, siteUrl } from "./env";
import { getServiceSupabase } from "./supabase";

export const SQUARE_VERSION = "2026-09-16";
export const SQUARE_WEBHOOK_NAME = "NEVERHOLLOW storefront orders";
export const SQUARE_EVENTS = ["payment.created", "payment.updated", "refund.created", "refund.updated"] as const;
/** Marks orders made by this website, so in-person or other Square sales are never imported. */
export const STORE_TAG = "neverhollow-web";

export interface SqMoney {
  amount: number;
  currency: string;
}
export interface SqAddress {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  administrative_district_level_1?: string;
  postal_code?: string;
  country?: string;
  first_name?: string;
  last_name?: string;
}
export interface SqLineItem {
  uid?: string;
  name?: string;
  quantity: string;
  variation_name?: string;
  base_price_money?: SqMoney;
  total_money?: SqMoney;
  metadata?: Record<string, string>;
}
export interface SqOrder {
  id: string;
  location_id: string;
  reference_id?: string;
  state?: "OPEN" | "COMPLETED" | "CANCELED" | "DRAFT";
  metadata?: Record<string, string>;
  line_items?: SqLineItem[];
  fulfillments?: {
    type?: string;
    shipment_details?: {
      recipient?: { display_name?: string; email_address?: string; phone_number?: string; address?: SqAddress };
    };
  }[];
  tenders?: { id: string; payment_id?: string; type?: string }[];
  total_money?: SqMoney;
  total_tax_money?: SqMoney;
  total_discount_money?: SqMoney;
  total_service_charge_money?: SqMoney;
  net_amount_due_money?: SqMoney;
  created_at?: string;
}
export interface SqPayment {
  id: string;
  status: "APPROVED" | "PENDING" | "COMPLETED" | "CANCELED" | "FAILED";
  order_id?: string;
  location_id?: string;
  total_money?: SqMoney;
  refunded_money?: SqMoney;
  buyer_email_address?: string;
  shipping_address?: SqAddress;
}
interface SqLocation {
  id: string;
  name?: string;
  status?: string;
  currency?: string;
  country?: string;
  capabilities?: string[];
}
interface SqSubscription {
  id: string;
  name?: string;
  enabled?: boolean;
  notification_url?: string;
  signature_key?: string;
}

export class SquareError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code?: string,
  ) {
    super(message);
  }
}

const apiBase = () => (env.squareEnvironment === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com");

/** "live" with a production token, "test" in Square's sandbox. */
export const squareMode = (): "live" | "test" | null =>
  env.squareAccessToken ? (env.squareEnvironment === "sandbox" ? "test" : "live") : null;

export async function squareFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = env.squareAccessToken;
  if (!token) throw new SquareError("Square isn’t connected. Add SQUARE_ACCESS_TOKEN.");
  const res = await fetch(apiBase() + path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${token}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { errors?: { detail?: string; code?: string }[] } & T;
  if (!res.ok || json.errors?.length) {
    const e = json.errors?.[0];
    throw new SquareError(e?.detail ?? `Square request failed (${res.status}).`, res.status, e?.code);
  }
  return json;
}

/* ───────────── Location ───────────── */
let cachedLocation: SqLocation | null = null;
let locationFailedAt = 0;
let locationError: string | null = null;

/** The Square location payments go to: SQUARE_LOCATION_ID, else the account's main active one. */
export async function squareLocation(): Promise<SqLocation> {
  if (cachedLocation) return cachedLocation;
  if (env.squareLocationId) {
    const { location } = await squareFetch<{ location: SqLocation }>(`/v2/locations/${encodeURIComponent(env.squareLocationId)}`);
    return (cachedLocation = location);
  }
  const { locations = [] } = await squareFetch<{ locations?: SqLocation[] }>("/v2/locations");
  const active = locations.filter((l) => l.status === "ACTIVE");
  const pick = active.find((l) => l.capabilities?.includes("CREDIT_CARD_PROCESSING")) ?? active[0];
  if (!pick) throw new SquareError("Your Square account has no active location yet. Finish setting up Square.");
  return (cachedLocation = pick);
}

/** True when the token works. Failures are retried after five minutes, not on every page view. */
export async function squareReachable(): Promise<boolean> {
  if (!env.squareAccessToken) return false;
  if (cachedLocation) return true;
  if (Date.now() - locationFailedAt < 5 * 60_000) return false;
  try {
    await squareLocation();
    locationError = null;
    return true;
  } catch (e) {
    locationFailedAt = Date.now();
    locationError = e instanceof Error ? e.message : String(e);
    return false;
  }
}
export const squareLocationError = () => locationError;

/* ───────────── Stored secrets ───────────── */
async function readSecret(key: string): Promise<string | null> {
  const sb = getServiceSupabase();
  if (!sb) return null;
  const { data } = await sb.from("store_secrets").select("value").eq("key", key).maybeSingle();
  return (data?.value as string | undefined) ?? null;
}
async function writeSecret(key: string, value: string): Promise<void> {
  const sb = getServiceSupabase();
  if (!sb) throw new Error("The Supabase secret (service role) key is missing.");
  const { error } = await sb.from("store_secrets").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

/* ───────────── Webhook ───────────── */
export const squareWebhookUrl = () => `${siteUrl()}/api/webhooks/square`;
const keyName = (mode: "live" | "test") => `square_webhook_key_${mode}`;
const urlName = (mode: "live" | "test") => `square_webhook_url_${mode}`;
const lastName = (mode: "live" | "test") => `square_last_event_${mode}`;

/** Signature keys to check events against, each with the exact URL Square signs with. */
export async function squareWebhookKeys(): Promise<{ key: string; url: string }[]> {
  const mode = squareMode();
  if (!mode) return [];
  const out: { key: string; url: string }[] = [];
  const [key, url] = await Promise.all([readSecret(keyName(mode)), readSecret(urlName(mode))]);
  if (key && url) out.push({ key, url });
  if (env.squareWebhookKey) out.push({ key: env.squareWebhookKey, url: squareWebhookUrl() });
  return out;
}

const samePath = (a: string | undefined, b: string) => {
  try {
    return Boolean(a) && new URL(a!).pathname === new URL(b).pathname;
  } catch {
    return false;
  }
};

let webhookTriedAt = 0;
let webhookError: string | null = null;

/**
 * Makes sure Square sends this site its payment events, creating the subscription the first time
 * (and again if the site's address changes). The signature key is kept server-side only.
 */
export async function ensureSquareWebhook(force = false): Promise<{ ok: boolean; error?: string }> {
  const mode = squareMode();
  if (!mode) return { ok: false, error: "Square isn’t connected." };
  if (env.squareWebhookKey) return { ok: true };
  const url = squareWebhookUrl();
  if (!url.startsWith("https://") || /\/\/(localhost|127\.0\.0\.1)/.test(url)) {
    return { ok: false, error: `Square can only send events to a public https address, and this site’s address is ${url}.` };
  }
  const [storedKey, storedUrl] = await Promise.all([readSecret(keyName(mode)), readSecret(urlName(mode))]);
  if (!force && storedKey && storedUrl === url) return { ok: true };
  if (!force && Date.now() - webhookTriedAt < 10 * 60_000) return { ok: false, error: webhookError ?? undefined };
  webhookTriedAt = Date.now();
  try {
    const { subscriptions = [] } = await squareFetch<{ subscriptions?: SqSubscription[] }>("/v2/webhooks/subscriptions");
    // The key is only shown when a subscription is created, so ours are replaced, never reused.
    for (const s of subscriptions) {
      if (s.notification_url === url || (s.name === SQUARE_WEBHOOK_NAME && samePath(s.notification_url, url))) {
        await squareFetch(`/v2/webhooks/subscriptions/${encodeURIComponent(s.id)}`, { method: "DELETE" });
      }
    }
    const { subscription } = await squareFetch<{ subscription: SqSubscription }>("/v2/webhooks/subscriptions", {
      body: {
        idempotency_key: crypto.randomUUID(),
        subscription: { name: SQUARE_WEBHOOK_NAME, enabled: true, event_types: [...SQUARE_EVENTS], notification_url: url, api_version: SQUARE_VERSION },
      },
    });
    if (!subscription?.signature_key) throw new SquareError("Square didn’t return a signature key.");
    await writeSecret(keyName(mode), subscription.signature_key);
    await writeSecret(urlName(mode), url);
    webhookError = null;
    return { ok: true };
  } catch (e) {
    webhookError = e instanceof Error ? e.message : String(e);
    return { ok: false, error: webhookError };
  }
}

export async function noteSquareEvent() {
  const mode = squareMode();
  if (!mode) return;
  try {
    await writeSecret(lastName(mode), new Date().toISOString());
  } catch {
    /* diagnostics only */
  }
}
export async function lastSquareEvent(): Promise<string | null> {
  const mode = squareMode();
  return mode ? readSecret(lastName(mode)) : null;
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

/** Square signs the notification URL followed by the raw body with HMAC-SHA256, base64. */
export async function squareSignature(body: string, key: string, url: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(url + body))));
}

export async function verifySquareSignature(body: string, signature: string, key: string, url: string): Promise<boolean> {
  if (!signature) return false;
  const expected = await squareSignature(body, key, url);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

/* ───────────── Checkout ───────────── */
export interface SquareCheckoutLine {
  name: string;
  size: string;
  color: string | null;
  quantity: number;
  unitCents: number;
  productId: string;
  variantId: string;
}

/**
 * A one-time Square checkout link for the bag. Prices come from the database (never the
 * browser); shipping is charged for the destination chosen in the bag.
 */
export async function createSquareCheckout(args: {
  ref: string;
  lines: SquareCheckoutLine[];
  currency: string;
  shipping: { name: string; cents: number };
  country: string;
  zoneId: string;
  email: string | null;
  userId: string | null;
  supportEmail: string | null;
  redirectUrl: string;
}): Promise<{ url: string; orderId: string }> {
  const location = await squareLocation();
  const cur = args.currency.toUpperCase();
  const money = (amount: number) => ({ amount, currency: cur });
  const { payment_link } = await squareFetch<{ payment_link: { id: string; url: string; order_id: string } }>(
    "/v2/online-checkout/payment-links",
    {
      body: {
        idempotency_key: args.ref,
        order: {
          location_id: location.id,
          reference_id: args.ref.slice(0, 40),
          source: { name: "NEVERHOLLOW website" },
          line_items: args.lines.map((l) => ({
            name: l.name,
            quantity: String(l.quantity),
            variation_name: `Size ${l.size}`,
            base_price_money: money(l.unitCents),
            metadata: {
              product_id: l.productId,
              variant_id: l.variantId,
              size: l.size.slice(0, 255),
              ...(l.color ? { color: l.color.slice(0, 255) } : {}),
            },
          })),
          metadata: {
            source: STORE_TAG,
            ref: args.ref,
            zone_id: args.zoneId,
            country: args.country,
            ...(args.userId ? { user_id: args.userId } : {}),
          },
        },
        checkout_options: {
          redirect_url: args.redirectUrl,
          ask_for_shipping_address: true,
          allow_tipping: false,
          accepted_payment_methods: { apple_pay: true, google_pay: true, cash_app_pay: true, afterpay_clearpay: false },
          ...(args.supportEmail ? { merchant_support_email: args.supportEmail } : {}),
          ...(args.shipping.cents > 0 ? { shipping_fee: { name: args.shipping.name, charge: money(args.shipping.cents) } } : {}),
        },
        pre_populated_data: {
          ...(args.email ? { buyer_email: args.email } : {}),
          buyer_address: { country: args.country },
        },
      },
    },
  );
  return { url: payment_link.url, orderId: payment_link.order_id };
}

export const getSquarePayment = (id: string) =>
  squareFetch<{ payment: SqPayment }>(`/v2/payments/${encodeURIComponent(id)}`).then((r) => r.payment);
export const getSquareOrder = (id: string) => squareFetch<{ order: SqOrder }>(`/v2/orders/${encodeURIComponent(id)}`).then((r) => r.order);

export const isStoreOrder = (o: SqOrder | null | undefined): o is SqOrder => o?.metadata?.source === STORE_TAG;

/** The completed payment behind an order, if it's been paid in full. */
export async function paidPaymentFor(order: SqOrder): Promise<SqPayment | null> {
  if (order.state !== "OPEN" && order.state !== "COMPLETED") return null;
  if ((order.net_amount_due_money?.amount ?? 0) > 0) return null;
  for (const t of order.tenders ?? []) {
    const payment = await getSquarePayment(t.payment_id ?? t.id).catch(() => null);
    if (payment?.status === "COMPLETED") return payment;
  }
  return null;
}

/** Website orders from the last `days` days that have been paid, newest first. */
export async function recentSquareOrders(days = 14): Promise<SqOrder[]> {
  const location = await squareLocation();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { orders = [] } = await squareFetch<{ orders?: SqOrder[] }>("/v2/orders/search", {
    body: {
      location_ids: [location.id],
      query: {
        filter: { state_filter: { states: ["OPEN", "COMPLETED"] }, date_time_filter: { created_at: { start_at: since } } },
        sort: { sort_field: "CREATED_AT", sort_order: "DESC" },
      },
      limit: 100,
    },
  });
  return orders.filter(isStoreOrder);
}
