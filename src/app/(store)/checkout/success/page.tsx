import type { Metadata } from "next";
import { CheckoutSuccessView } from "@/components/views/MiscViews";
import { confirmSquareReturn } from "@/lib/server/square-orders";
import { getStripe } from "@/lib/server/stripe";

export const metadata: Metadata = { title: "Order", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ session_id?: string; ref?: string; try?: string }> };

/**
 * Payment status is read from the payment company on the server (Square: ?ref=, Stripe:
 * ?session_id=). Nothing here is assumed or simulated: "confirmed" only shows once it's paid.
 */
export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id, ref, try: attempt } = await searchParams;
  if (ref) {
    const r = await confirmSquareReturn(ref);
    // Square can take a few seconds to settle a payment: re-check up to six times first.
    const confirming = !r.paid && Number(attempt ?? "0") < 6;
    return <CheckoutSuccessView paid={r.paid} email={r.email} orderRef={r.orderNumber} confirming={confirming} />;
  }
  const stripe = getStripe();
  let paid = false;
  let email: string | null = null;
  let orderRef: string | null = null;
  if (stripe && session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id)) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
      email = session.customer_details?.email ?? null;
      orderRef = session.id.slice(-10).toUpperCase();
    } catch {
      paid = false;
    }
  }
  return <CheckoutSuccessView paid={paid} email={email} orderRef={orderRef} />;
}
