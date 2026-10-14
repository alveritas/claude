import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { orderConfirmationEmail, sendEmail } from "@/lib/server/email";
import { getStripe, noteWebhookEvent, webhookSecrets } from "@/lib/server/stripe";
import { getServiceSupabase } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

/**
 * Stripe → orders. Signature-verified; idempotent on the Checkout Session id.
 * The endpoint is created from Admin → Payments (or by hand) with the events in WEBHOOK_EVENTS.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const sb = getServiceSupabase();
  const secrets = await webhookSecrets();
  if (!stripe || !secrets.length || !sb) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature") ?? "";
  const payload = await req.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
      break;
    } catch {
      /* try the next secret */
    }
  }
  if (!event) {
    console.error("Stripe signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  await noteWebhookEvent(event.livemode);

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      // Re-read the session from Stripe rather than trusting the event body.
      const session = await stripe.checkout.sessions.retrieve((event.data.object as Stripe.Checkout.Session).id);
      // "no_payment_required" covers orders fully paid by a 100% promotion code.
      if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
        await recordOrder(stripe, sb, session);
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi && charge.refunded) await sb.from("orders").update({ status: "refunded" }).eq("stripe_payment_intent", pi);
    }
  } catch (e) {
    console.error("Stripe webhook handling failed", e);
    // Non-2xx makes Stripe retry, which is safe because recording is idempotent.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

type ServiceClient = NonNullable<ReturnType<typeof getServiceSupabase>>;

async function recordOrder(stripe: Stripe, sb: ServiceClient, session: Stripe.Checkout.Session) {
  const { data: existing } = await sb.from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle();
  if (existing) return;

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });

  // API versions differ on where shipping details live.
  const s = session as Stripe.Checkout.Session & {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
    collected_information?: { shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null } | null;
  };
  const shipping = s.collected_information?.shipping_details ?? s.shipping_details ?? null;
  const totals = session.total_details;
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const userId = session.client_reference_id && /^[0-9a-f-]{36}$/i.test(session.client_reference_id) ? session.client_reference_id : null;

  const { data: order, error } = await sb
    .from("orders")
    .insert({
      stripe_session_id: session.id,
      stripe_payment_intent: paymentIntent,
      livemode: session.livemode,
      user_id: userId,
      email: session.customer_details?.email ?? null,
      phone: session.customer_details?.phone ?? null,
      status: "paid",
      currency: session.currency ?? "usd",
      subtotal_cents: session.amount_subtotal ?? 0,
      shipping_cents: totals?.amount_shipping ?? 0,
      tax_cents: totals?.amount_tax ?? 0,
      discount_cents: totals?.amount_discount ?? 0,
      total_cents: session.amount_total ?? 0,
      shipping_name: shipping?.name ?? session.customer_details?.name ?? null,
      shipping_address: shipping?.address ?? null,
    })
    .select("id, order_number")
    .single();
  if (error) {
    if (error.code === "23505") return; // a concurrent delivery already recorded it
    throw new Error(`order insert failed: ${error.message}`);
  }

  let stockIssue = false;
  const emailLines: { name: string; size: string | null; quantity: number; unitCents: number }[] = [];
  for (const li of lineItems.data) {
    const product = li.price?.product as Stripe.Product | undefined;
    const md = product?.metadata ?? {};
    const quantity = li.quantity ?? 1;
    const unit = li.price?.unit_amount ?? Math.round((li.amount_subtotal ?? 0) / quantity);
    const name = (product?.name ?? li.description ?? "Item").replace(/^NEVERHOLLOW\s+/, "");
    await sb.from("order_items").insert({
      order_id: order.id,
      product_id: md.product_id || null,
      variant_id: md.variant_id || null,
      name,
      size: md.size || null,
      color: md.color || null,
      unit_price_cents: unit,
      quantity,
    });
    emailLines.push({ name, size: md.size || null, quantity, unitCents: unit });
    // Test-mode purchases never touch real stock.
    if (md.variant_id && session.livemode) {
      const { data: ok, error: rpcError } = await sb.rpc("decrement_stock", { p_variant: md.variant_id, p_qty: quantity });
      if (rpcError || ok !== true) stockIssue = true;
    }
  }
  if (stockIssue) await sb.from("orders").update({ stock_issue: true }).eq("id", order.id);

  const to = session.customer_details?.email;
  if (to) {
    const mail = orderConfirmationEmail({
      orderNumber: order.order_number,
      lines: emailLines,
      totalCents: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
    });
    await sendEmail({ to, ...mail });
  }
}
