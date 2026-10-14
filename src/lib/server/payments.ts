/**
 * Which payment company the store uses: Square if SQUARE_ACCESS_TOKEN is set, otherwise PayPal
 * (paid to the PayPal email in src/data/launch.ts, or PAYPAL_EMAIL), with Stripe kept only as a
 * last fallback.
 */
import { hasSquare, hasStripe } from "./env";
import { paypalEmail, paypalMode } from "./paypal";
import { ensureSquareWebhook, squareMode, squareReachable } from "./square";
import { stripeMode, webhookConfigured } from "./stripe";

export type PaymentProvider = "square" | "paypal" | "stripe";

export const activeProvider = (): PaymentProvider | null =>
  hasSquare() ? "square" : paypalEmail() ? "paypal" : hasStripe() ? "stripe" : null;

const NAMES: Record<PaymentProvider, string> = { square: "Square", paypal: "PayPal", stripe: "Stripe" };

/** The name customers see on the trust line and in the policies. */
export const processorName = (): string | null => {
  const p = activeProvider();
  return p ? NAMES[p] : null;
};

/**
 * How customers can pay, in the words shown under the buy buttons and in the bag.
 * cashApp: the store also takes Cash App by $Cashtag (US shoppers).
 */
export const paymentMethodsText = (cashApp = false): string | null => {
  const p = activeProvider();
  if (p === "square") return "Pay by card, Apple Pay, Google Pay or Cash App Pay.";
  if (p === "paypal") return cashApp ? "Pay by debit or credit card, PayPal, or Cash App (US)." : "Pay by debit or credit card, or PayPal.";
  if (p === "stripe" && cashApp) return "Pay by card, or Cash App (US).";
  return null;
};

export function paymentMode(): "live" | "test" | null {
  const p = activeProvider();
  return p === "square" ? squareMode() : p === "paypal" ? paypalMode() : p === "stripe" ? stripeMode() : null;
}

/** Whether checkout can take payments right now. */
export async function paymentsReady(): Promise<boolean> {
  const p = activeProvider();
  if (p === "square") {
    const ok = await squareReachable();
    if (ok) await ensureSquareWebhook().catch(() => undefined);
    return ok;
  }
  if (p === "paypal") return true;
  if (p === "stripe") return webhookConfigured();
  return false;
}
