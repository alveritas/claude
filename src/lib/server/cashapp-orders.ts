import type { CheckoutCustomer } from "@/lib/shared/checkout";
import { cashAppPayUrl, cashTag } from "./cashapp";
import { cashAppInstructionsEmail, orderConfirmationEmail, sendEmail } from "./email";
import { siteUrl } from "./env";
import { getServiceSupabase } from "./supabase";

export const cashAppRef = (ref: string) => `cashapp:${ref}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PricedLine {
  name: string;
  size: string;
  color: string | null;
  quantity: number;
  unitCents: number;
  productId: string;
  variantId: string;
}

/**
 * Saves a Cash App order as "awaiting payment", with prices already checked against the
 * catalogue. Stock isn't taken until the owner confirms the money arrived (see settleCashAppOrder).
 */
export async function createCashAppOrder(args: {
  ref: string;
  lines: PricedLine[];
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  customer: CheckoutCustomer;
  userId: string | null;
}): Promise<{ orderNumber: string } | null> {
  const sb = getServiceSupabase();
  const tag = cashTag();
  if (!sb || !tag) return null;
  const c = args.customer;
  const total = args.subtotalCents + args.shippingCents;
  const { data: order, error } = await sb
    .from("orders")
    .insert({
      payment_provider: "cashapp",
      stripe_session_id: cashAppRef(args.ref),
      checkout_ref: args.ref,
      livemode: true,
      user_id: args.userId,
      email: c.email,
      phone: c.phone,
      status: "awaiting_payment",
      currency: args.currency.toLowerCase(),
      subtotal_cents: args.subtotalCents,
      shipping_cents: args.shippingCents,
      tax_cents: 0,
      discount_cents: 0,
      total_cents: total,
      shipping_name: c.name,
      shipping_address: { line1: c.line1, line2: c.line2, city: c.city, state: c.state, postal_code: c.postal, country: c.country },
      note: `Cash App: check that ${(total / 100).toFixed(2)} arrived at ${tag} with this order number in the note before marking it Paid.`,
    })
    .select("id, order_number")
    .single();
  if (error || !order) {
    console.error("Cash App order insert failed", error);
    return null;
  }
  const { error: itemsError } = await sb.from("order_items").insert(
    args.lines.map((l) => ({
      order_id: order.id,
      product_id: UUID.test(l.productId) ? l.productId : null,
      variant_id: UUID.test(l.variantId) ? l.variantId : null,
      name: l.name,
      size: l.size,
      color: l.color,
      unit_price_cents: l.unitCents,
      quantity: l.quantity,
    })),
  );
  if (itemsError) {
    await sb.from("orders").delete().eq("id", order.id);
    console.error("Cash App order items failed", itemsError);
    return null;
  }
  await sendEmail({
    to: c.email,
    ...cashAppInstructionsEmail({
      orderNumber: order.order_number,
      cashTag: tag,
      totalCents: total,
      currency: args.currency,
      payUrl: cashAppPayUrl(tag, total),
      orderUrl: `${siteUrl()}/checkout/cashapp?ref=${args.ref}`,
    }),
  });
  return { orderNumber: order.order_number };
}

export interface CashAppOrder {
  orderNumber: string;
  status: string;
  email: string | null;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  currency: string;
  shippingName: string | null;
  address: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null } | null;
  items: { name: string; size: string | null; quantity: number; unitCents: number }[];
}

/** The order page after placing a Cash App order. The ref is the only key: random and private. */
export async function getCashAppOrder(ref: string | undefined): Promise<CashAppOrder | null> {
  const sb = getServiceSupabase();
  if (!sb || !ref || !UUID.test(ref)) return null;
  const { data } = await sb
    .from("orders")
    .select("id, order_number, status, email, total_cents, subtotal_cents, shipping_cents, currency, shipping_name, shipping_address")
    .eq("stripe_session_id", cashAppRef(ref))
    .maybeSingle();
  if (!data) return null;
  const { data: items } = await sb.from("order_items").select("name, size, quantity, unit_price_cents").eq("order_id", data.id);
  return {
    orderNumber: data.order_number,
    status: data.status,
    email: data.email ?? null,
    totalCents: data.total_cents,
    subtotalCents: data.subtotal_cents,
    shippingCents: data.shipping_cents,
    currency: data.currency,
    shippingName: data.shipping_name ?? null,
    address: (data.shipping_address as CashAppOrder["address"]) ?? null,
    items: ((items ?? []) as { name: string; size: string | null; quantity: number; unit_price_cents: number }[]).map((i) => ({
      name: i.name,
      size: i.size,
      quantity: i.quantity,
      unitCents: i.unit_price_cents,
    })),
  };
}

/**
 * The owner marked a Cash App order Paid (after seeing the money in Cash App): take the stock
 * and send the order confirmation. Runs once, on the change from awaiting payment to paid.
 */
export async function settleCashAppOrder(orderId: string): Promise<{ stockIssue: boolean; emailed: boolean }> {
  const sb = getServiceSupabase();
  if (!sb) return { stockIssue: false, emailed: false };
  const { data: o } = await sb.from("orders").select("id, order_number, email, total_cents, currency").eq("id", orderId).maybeSingle();
  if (!o) return { stockIssue: false, emailed: false };
  const { data: rows } = await sb.from("order_items").select("name, size, quantity, unit_price_cents, variant_id").eq("order_id", o.id);
  const items = (rows ?? []) as { name: string; size: string | null; quantity: number; unit_price_cents: number; variant_id: string | null }[];
  let stockIssue = false;
  for (const it of items) {
    if (!it.variant_id) continue;
    const { data: ok, error } = await sb.rpc("decrement_stock", { p_variant: it.variant_id, p_qty: it.quantity });
    if (error || ok !== true) stockIssue = true;
  }
  if (stockIssue) await sb.from("orders").update({ stock_issue: true }).eq("id", o.id);
  const emailed = o.email
    ? await sendEmail({
        to: o.email,
        ...orderConfirmationEmail({
          orderNumber: o.order_number,
          lines: items.map((i) => ({ name: i.name, size: i.size, quantity: i.quantity, unitCents: i.unit_price_cents })),
          totalCents: o.total_cents,
          currency: o.currency,
        }),
      })
    : false;
  return { stockIssue, emailed };
}
