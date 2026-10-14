/**
 * Which payment company the store uses. Square whenever SQUARE_ACCESS_TOKEN is set (card,
 * Apple Pay, Google Pay and Cash App Pay); Stripe only as a fallback if it's the only one set up.
 */
import { hasSquare, hasStripe } from "./env";
import { ensureSquareWebhook, squareMode, squareReachable } from "./square";
import { stripeMode, webhookConfigured } from "./stripe";

export type PaymentProvider = "square" | "stripe";

export const activeProvider = (): PaymentProvider | null => (hasSquare() ? "square" : hasStripe() ? "stripe" : null);

/** The name customers see on the trust line and in the policies. */
export const processorName = (): string | null => {
  const p = activeProvider();
  return p === "square" ? "Square" : p === "stripe" ? "Stripe" : null;
};

export function paymentMode(): "live" | "test" | null {
  const p = activeProvider();
  return p === "square" ? squareMode() : p === "stripe" ? stripeMode() : null;
}

/**
 * Whether checkout can take payments right now. Square: the token works (and order
 * notifications are connected automatically along the way). Stripe: its webhook is connected.
 */
export async function paymentsReady(): Promise<boolean> {
  const p = activeProvider();
  if (p === "square") {
    const ok = await squareReachable();
    if (ok) await ensureSquareWebhook().catch(() => undefined);
    return ok;
  }
  if (p === "stripe") return webhookConfigured();
  return false;
}
