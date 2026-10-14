/**
 * Cash App, paid by $Cashtag. There's no payment company in between: the shopper places the
 * order here, then sends the total to the store's $Cashtag with the order number in the note,
 * and the owner marks the order Paid in the admin once the money shows in Cash App. Nothing on
 * the site ever says "paid" until then.
 *
 * Needs the database (the order has to be kept somewhere until the money arrives), and only
 * works for US shoppers paying in US dollars, because that's what Cash App supports.
 */
import { LAUNCH } from "@/data/launch";
import { env, hasServiceRole } from "./env";

/** "$neverhollow" from "$neverhollow", "neverhollow" or a cash.app link; null when unset or off. */
export function cashTag(): string | null {
  const raw = (env.cashTag ?? LAUNCH.cashTag ?? "").trim();
  if (!raw || /^(off|none|disabled)$/i.test(raw)) return null;
  const m = raw.replace(/^https?:\/\/(www\.)?cash\.app\//i, "").replace(/\/.*$/, "").match(/^\$?([A-Za-z0-9_]{1,20})$/);
  return m && /[A-Za-z]/.test(m[1]) ? `$${m[1]}` : null;
}

/** Countries whose shoppers can pay by Cash App (US dollars only). */
export const CASH_APP_COUNTRIES = new Set(["US"]);

export const cashAppReady = (currency: string) => Boolean(cashTag()) && hasServiceRole() && currency.toLowerCase() === "usd";

/** Opens Cash App on the store's $Cashtag with the amount filled in. */
export const cashAppPayUrl = (tag: string, cents: number) => `https://cash.app/${tag}/${(cents / 100).toFixed(2)}`;
