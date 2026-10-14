import { NextResponse } from "next/server";
import { handleSquarePayment, handleSquareRefund } from "@/lib/server/square-orders";
import { noteSquareEvent, squareWebhookKeys, verifySquareSignature } from "@/lib/server/square";

export const dynamic = "force-dynamic";

/**
 * Square → orders. Every event is signature-checked, then the payment is re-read from Square
 * (the event body is never trusted). Recording is idempotent, so Square's retries are safe.
 */
export async function POST(req: Request) {
  const keys = await squareWebhookKeys();
  if (!keys.length) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const body = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";
  let valid = false;
  for (const k of keys) {
    if (await verifySquareSignature(body, signature, k.key, k.url)) {
      valid = true;
      break;
    }
  }
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });

  let event: { type?: string; data?: { id?: string; object?: { payment?: { id?: string }; refund?: { payment_id?: string } } } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  await noteSquareEvent();
  try {
    if (event.type === "payment.created" || event.type === "payment.updated") {
      const id = event.data?.object?.payment?.id ?? event.data?.id;
      if (id) await handleSquarePayment(id);
    } else if (event.type === "refund.created" || event.type === "refund.updated") {
      const paymentId = event.data?.object?.refund?.payment_id;
      if (paymentId) await handleSquareRefund(paymentId);
    }
  } catch (e) {
    console.error("Square webhook handling failed", e);
    // A non-2xx makes Square retry later, which is safe.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
