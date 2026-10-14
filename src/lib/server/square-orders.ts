import { orderConfirmationEmail, sendEmail } from "./email";
import {
  getSquareOrder,
  getSquarePayment,
  isStoreOrder,
  paidPaymentFor,
  recentSquareOrders,
  squareMode,
  type SqAddress,
  type SqOrder,
  type SqPayment,
} from "./square";
import { getServiceSupabase } from "./supabase";

/** Our order rows keep the Square order id here (the column predates Square), prefixed. */
export const squareRef = (orderId: string) => `square:${orderId}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const address = (a: SqAddress | undefined | null) =>
  a
    ? {
        line1: a.address_line_1 ?? null,
        line2: a.address_line_2 ?? null,
        city: a.locality ?? null,
        state: a.administrative_district_level_1 ?? null,
        postal_code: a.postal_code ?? null,
        country: a.country ?? null,
      }
    : null;

/**
 * Saves a paid website order once: the order, its lines, the stock change and the confirmation
 * email. Safe to call any number of times for the same order (webhook retries, the buyer's
 * return, the admin sync); only the first call does anything.
 */
export async function recordSquareOrder(order: SqOrder, payment: SqPayment): Promise<{ orderNumber: string; email: string | null } | null> {
  const sb = getServiceSupabase();
  if (!sb || !isStoreOrder(order) || payment.status !== "COMPLETED" || payment.order_id !== order.id) return null;
  const ref = squareRef(order.id);
  const { data: existing } = await sb.from("orders").select("order_number, email").eq("stripe_session_id", ref).maybeSingle();
  if (existing) return { orderNumber: existing.order_number, email: existing.email ?? null };

  const recipient = order.fulfillments?.find((f) => f.type === "SHIPMENT" || f.shipment_details)?.shipment_details?.recipient;
  const shipTo = recipient?.address ?? payment.shipping_address ?? null;
  const lines = (order.line_items ?? []).map((li) => {
    const quantity = Math.max(1, parseInt(li.quantity, 10) || 1);
    return {
      li,
      quantity,
      unit: li.base_price_money?.amount ?? Math.round((li.total_money?.amount ?? 0) / quantity),
      md: li.metadata ?? {},
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.unit * l.quantity, 0);
  const livemode = squareMode() === "live";
  const paidFor = order.metadata?.country ?? null;
  const shippedTo = shipTo?.country ?? null;
  const note =
    paidFor && shippedTo && paidFor !== shippedTo
      ? `Shipping was paid for ${paidFor} but the address is in ${shippedTo}. Check the shipping cost before sending.`
      : null;
  const email = payment.buyer_email_address ?? recipient?.email_address ?? null;
  const userId = order.metadata?.user_id && UUID.test(order.metadata.user_id) ? order.metadata.user_id : null;

  const { data: row, error } = await sb
    .from("orders")
    .insert({
      payment_provider: "square",
      stripe_session_id: ref,
      stripe_payment_intent: payment.id,
      livemode,
      user_id: userId,
      email,
      phone: recipient?.phone_number ?? null,
      status: "paid",
      currency: (order.total_money?.currency ?? "USD").toLowerCase(),
      subtotal_cents: subtotal,
      shipping_cents: order.total_service_charge_money?.amount ?? 0,
      tax_cents: order.total_tax_money?.amount ?? 0,
      discount_cents: order.total_discount_money?.amount ?? 0,
      total_cents: order.total_money?.amount ?? payment.total_money?.amount ?? 0,
      shipping_name: recipient?.display_name ?? ([shipTo?.first_name, shipTo?.last_name].filter(Boolean).join(" ") || null),
      shipping_address: address(shipTo),
      note,
    })
    .select("id, order_number")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: again } = await sb.from("orders").select("order_number, email").eq("stripe_session_id", ref).maybeSingle();
      return again ? { orderNumber: again.order_number, email: again.email ?? null } : null;
    }
    throw new Error(`order insert failed: ${error.message}`);
  }

  let stockIssue = false;
  const emailLines: { name: string; size: string | null; quantity: number; unitCents: number }[] = [];
  for (const { li, quantity, unit, md } of lines) {
    const name = (li.name ?? "Item").replace(/^NEVERHOLLOW\s+/, "");
    const size = md.size ?? li.variation_name?.replace(/^Size\s+/i, "") ?? null;
    await sb.from("order_items").insert({
      order_id: row.id,
      product_id: md.product_id && UUID.test(md.product_id) ? md.product_id : null,
      variant_id: md.variant_id && UUID.test(md.variant_id) ? md.variant_id : null,
      name,
      size,
      color: md.color ?? null,
      unit_price_cents: unit,
      quantity,
    });
    emailLines.push({ name, size, quantity, unitCents: unit });
    // Sandbox (test) purchases never touch real stock.
    if (livemode && md.variant_id && UUID.test(md.variant_id)) {
      const { data: ok, error: rpcError } = await sb.rpc("decrement_stock", { p_variant: md.variant_id, p_qty: quantity });
      if (rpcError || ok !== true) stockIssue = true;
    }
  }
  if (stockIssue) await sb.from("orders").update({ stock_issue: true }).eq("id", row.id);

  if (email) {
    const mail = orderConfirmationEmail({
      orderNumber: row.order_number,
      lines: emailLines,
      totalCents: order.total_money?.amount ?? 0,
      currency: (order.total_money?.currency ?? "USD").toLowerCase(),
    });
    await sendEmail({ to: email, ...mail });
  }
  return { orderNumber: row.order_number, email };
}

/** After a payment event: record the order if it's a paid website order. */
export async function handleSquarePayment(paymentId: string) {
  const payment = await getSquarePayment(paymentId);
  if (payment.status !== "COMPLETED" || !payment.order_id) return null;
  const order = await getSquareOrder(payment.order_id);
  return recordSquareOrder(order, payment);
}

/** After a refund event: a fully refunded payment marks its order Refunded. */
export async function handleSquareRefund(paymentId: string) {
  const sb = getServiceSupabase();
  if (!sb) return;
  const payment = await getSquarePayment(paymentId);
  const total = payment.total_money?.amount ?? 0;
  if (total > 0 && (payment.refunded_money?.amount ?? 0) >= total) {
    await sb.from("orders").update({ status: "refunded" }).eq("stripe_payment_intent", payment.id);
  }
}

/** Catches up on paid website orders the webhook may have missed. Returns how many were added. */
export async function syncSquareOrders(days = 14): Promise<number> {
  const sb = getServiceSupabase();
  if (!sb) return 0;
  const orders = await recentSquareOrders(days);
  if (!orders.length) return 0;
  const { data: known } = await sb
    .from("orders")
    .select("stripe_session_id")
    .in("stripe_session_id", orders.map((o) => squareRef(o.id)));
  const have = new Set((known ?? []).map((k) => k.stripe_session_id));
  let added = 0;
  for (const o of orders) {
    if (have.has(squareRef(o.id))) continue;
    const payment = await paidPaymentFor(o);
    if (payment && (await recordSquareOrder(o, payment))) added++;
  }
  return added;
}

/**
 * The confirmation page after Square sends the buyer back. Only says "paid" when Square
 * confirms it; the order is recorded here too, in case the webhook hasn't arrived yet.
 */
export async function confirmSquareReturn(ref: string | undefined): Promise<{ paid: boolean; email: string | null; orderNumber: string | null }> {
  const none = { paid: false, email: null, orderNumber: null };
  if (!ref || !UUID.test(ref)) return none;
  try {
    const sb = getServiceSupabase();
    const link = sb ? (await sb.from("checkout_refs").select("provider_order_id").eq("ref", ref).maybeSingle()).data : null;
    // Without the database (or if the link wasn't saved), find the order among today's.
    const order = link?.provider_order_id
      ? await getSquareOrder(link.provider_order_id)
      : (await recentSquareOrders(1)).find((o) => o.metadata?.ref === ref);
    if (!isStoreOrder(order) || order.metadata?.ref !== ref) return none;
    const payment = await paidPaymentFor(order);
    if (!payment) return none;
    const saved = await recordSquareOrder(order, payment);
    return { paid: true, email: saved?.email ?? payment.buyer_email_address ?? null, orderNumber: saved?.orderNumber ?? null };
  } catch {
    return none;
  }
}
