import { NextResponse } from "next/server";
import { handlePayPalNotification } from "@/lib/server/paypal-orders";
import { verifyPayPalNotification } from "@/lib/server/paypal";

export const dynamic = "force-dynamic";

/**
 * PayPal → orders (Instant Payment Notification). Every message is sent back to PayPal to
 * confirm it's genuine before anything is recorded; recording is idempotent on the transaction.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!(await verifyPayPalNotification(raw))) {
    return NextResponse.json({ error: "Not verified" }, { status: 400 });
  }
  try {
    await handlePayPalNotification(new URLSearchParams(raw));
  } catch (e) {
    console.error("PayPal notification failed", e);
    // A non-2xx makes PayPal resend later, which is safe.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return new NextResponse("OK", { status: 200 });
}
