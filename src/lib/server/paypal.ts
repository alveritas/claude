/**
 * PayPal checkout (PayPal Payments Standard). The only thing it needs is the PayPal account
 * email that receives the money, so there are no keys to set up. Buyers pay on PayPal's own
 * page with a debit or credit card or their PayPal account; card details never touch this site.
 *
 * Because the browser carries the buyer to PayPal, an order is only recorded after PayPal itself
 * confirms the payment (IPN, checked back with PayPal), and the amount paid is compared with the
 * real prices before the order is treated as paid in full.
 */
import { LAUNCH } from "@/data/launch";
import { env, siteUrl } from "./env";

/** PAYPAL_EMAIL overrides the address in launch.ts; PAYPAL_EMAIL=off switches PayPal off. */
export const paypalEmail = (): string | null => {
  if (env.paypalEmail && /^(off|none|disabled)$/i.test(env.paypalEmail)) return null;
  return env.paypalEmail ?? LAUNCH.paypalEmail ?? null;
};
export const paypalMode = (): "live" | "test" | null => (paypalEmail() ? (env.paypalSandbox ? "test" : "live") : null);

const webscr = () => (env.paypalSandbox ? "https://www.sandbox.paypal.com/cgi-bin/webscr" : "https://www.paypal.com/cgi-bin/webscr");
const ipnVerifyUrl = () => (env.paypalSandbox ? "https://ipnpb.sandbox.paypal.com/cgi-bin/webscr" : "https://ipnpb.paypal.com/cgi-bin/webscr");

export const paypalNotifyUrl = () => `${siteUrl()}/api/webhooks/paypal`;

export interface PayPalLine {
  name: string;
  size: string;
  quantity: number;
  unitCents: number;
  variantId: string;
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

/**
 * The PayPal checkout address for the bag: every line with the database price, one flat shipping
 * charge for the chosen destination, and where PayPal should send the buyer and the confirmation.
 */
export function paypalCheckoutUrl(args: {
  ref: string;
  lines: PayPalLine[];
  currency: string;
  shippingCents: number;
  country: string;
  email: string | null;
}): string {
  const base = siteUrl();
  const p = new URLSearchParams({
    cmd: "_cart",
    upload: "1",
    business: paypalEmail() ?? "",
    currency_code: args.currency.toUpperCase(),
    charset: "utf-8",
    no_shipping: "2", // shipping address required
    no_note: "1",
    rm: "1",
    lc: "US",
    country: args.country,
    cbt: "Return to NEVERHOLLOW",
    return: `${base}/checkout/success?ref=${args.ref}`,
    cancel_return: `${base}/cart`,
    notify_url: paypalNotifyUrl(),
    invoice: args.ref,
    custom: `${args.ref}|${args.country}`,
  });
  args.lines.forEach((l, i) => {
    const n = i + 1;
    p.set(`item_name_${n}`, `${l.name} — Size ${l.size}`.slice(0, 127));
    p.set(`item_number_${n}`, l.variantId);
    p.set(`amount_${n}`, dollars(l.unitCents));
    p.set(`quantity_${n}`, String(l.quantity));
  });
  // One flat shipping charge for the whole bag, on the first line ("regardless of quantity").
  if (args.shippingCents > 0) p.set("shipping_1", dollars(args.shippingCents));
  if (args.email) p.set("email", args.email);
  return `${webscr()}?${p.toString()}`;
}

/** Asks PayPal whether a notification really came from PayPal ("VERIFIED"). */
export async function verifyPayPalNotification(rawBody: string): Promise<boolean> {
  try {
    const res = await fetch(ipnVerifyUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NEVERHOLLOW-IPN" },
      body: `cmd=_notify-validate&${rawBody}`,
      cache: "no-store",
    });
    return res.ok && (await res.text()).trim() === "VERIFIED";
  } catch {
    return false;
  }
}

/** Dollars-and-cents text from PayPal ("148.00") to cents. */
export const toCents = (v: string | null | undefined) => {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
