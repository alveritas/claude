import Stripe from "stripe";
import { env, siteUrl } from "./env";
import { getServiceSupabase } from "./supabase";

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!env.stripeSecretKey) return null;
  client ??= new Stripe(env.stripeSecretKey, {
    appInfo: { name: "NEVERHOLLOW Storefront" },
  });
  return client;
}

export type StripeMode = "test" | "live";

/** Test or live, read from the key itself (sk_test_… / sk_live_…, or restricted rk_…). */
export function stripeMode(): StripeMode | null {
  const k = env.stripeSecretKey;
  if (!k) return null;
  if (/^(sk|rk)_live_/.test(k)) return "live";
  if (/^(sk|rk)_test_/.test(k)) return "test";
  return null;
}

/** Everything the order webhook listens for. */
export const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "charge.refunded",
] as const;

export const webhookUrl = () => `${siteUrl()}/api/webhooks/stripe`;

/** Every endpoint this store creates carries this description, so it can find its own later. */
export const WEBHOOK_DESCRIPTION = "NEVERHOLLOW storefront orders";

/**
 * True for an endpoint this store created for a different address (same description and path,
 * other host). Endpoints made by hand or by other apps in the same Stripe account are never matched.
 */
export function isOwnStaleEndpoint(ep: { url: string; description?: string | null }, currentUrl: string): boolean {
  if (ep.description !== WEBHOOK_DESCRIPTION || ep.url === currentUrl) return false;
  try {
    const a = new URL(ep.url);
    const b = new URL(currentUrl);
    return a.pathname === b.pathname && a.host !== b.host;
  } catch {
    return false;
  }
}

/** Stripe only delivers to public https addresses. */
export const webhookUrlIsPublic = () => /^https:\/\//.test(webhookUrl()) && !/\/\/(localhost|127\.|0\.0\.0\.0)/.test(webhookUrl());

const secretKey = (mode: StripeMode) => `stripe_webhook_secret_${mode}`;
const lastEventKey = (mode: StripeMode) => `stripe_last_event_${mode}`;

async function readSecret(key: string): Promise<string | null> {
  const sb = getServiceSupabase();
  if (!sb) return null;
  const { data } = await sb.from("store_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

async function writeSecret(key: string, value: string): Promise<void> {
  const sb = getServiceSupabase();
  if (!sb) throw new Error("The Supabase secret (service role) key is missing.");
  const { error } = await sb.from("store_secrets").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

/**
 * Signing secrets to verify webhooks against: STRIPE_WEBHOOK_SECRET if set, plus the one the
 * Payments page provisioned for the current mode.
 */
export async function webhookSecrets(): Promise<string[]> {
  const mode = stripeMode();
  const stored = mode ? await readSecret(secretKey(mode)) : null;
  return [...new Set([env.stripeWebhookSecret, stored].filter((s): s is string => Boolean(s)))];
}

export async function webhookConfigured(): Promise<boolean> {
  return (await webhookSecrets()).length > 0;
}

export async function saveWebhookSecret(mode: StripeMode, secret: string) {
  await writeSecret(secretKey(mode), secret);
}

export async function noteWebhookEvent(livemode: boolean) {
  try {
    await writeSecret(lastEventKey(livemode ? "live" : "test"), new Date().toISOString());
  } catch {
    /* diagnostics only */
  }
}

export async function lastWebhookEvent(mode: StripeMode): Promise<string | null> {
  return readSecret(lastEventKey(mode));
}

export async function hasStoredWebhookSecret(mode: StripeMode): Promise<boolean> {
  return Boolean(await readSecret(secretKey(mode)));
}

/* ───────────── Payment methods ─────────────
 * Stripe Checkout shows whichever methods are switched on in the account's default payment
 * method configuration (no list is hard-coded in the checkout code). Test and live mode each
 * have their own configuration.
 */

/** Methods the store asks for. Apple Pay rides on cards; Cash App Pay is US shoppers paying in USD. */
export const STORE_WALLETS = ["apple_pay", "cashapp"] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Cards",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  cashapp: "Cash App Pay",
  link: "Link",
};

export interface PaymentMethodStatus {
  key: string;
  label: string;
  available: boolean;
  on: boolean;
}

type MethodSetting = { available?: boolean; display_preference?: { value?: string | null } | null } | null | undefined;

async function defaultConfiguration(stripe: Stripe) {
  const list = await stripe.paymentMethodConfigurations.list({ limit: 100 });
  return list.data.find((c) => c.is_default && c.active) ?? list.data.find((c) => c.is_default) ?? null;
}

export async function paymentMethodStatus(stripe: Stripe): Promise<PaymentMethodStatus[] | null> {
  const cfg = await defaultConfiguration(stripe);
  if (!cfg) return null;
  return Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => {
    const m = (cfg as unknown as Record<string, MethodSetting>)[key];
    return { key, label, available: Boolean(m?.available), on: m?.display_preference?.value === "on" };
  });
}

/** Switches Apple Pay and Cash App Pay on in the current mode's default configuration. */
export async function turnOnStoreWallets(stripe: Stripe): Promise<void> {
  const cfg = await defaultConfiguration(stripe);
  if (!cfg) throw new Error("Stripe didn’t return any payment method settings for this account.");
  await stripe.paymentMethodConfigurations.update(cfg.id, {
    apple_pay: { display_preference: { preference: "on" } },
    cashapp: { display_preference: { preference: "on" } },
  });
}
