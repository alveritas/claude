import { shippingCents, zoneFor } from "@/lib/shared/shipping";
import { getStoreData } from "./catalog";
import { orderConfirmationEmail, sendEmail } from "./email";
import { paypalEmail, paypalMode, toCents } from "./paypal";
import { getServiceSupabase } from "./supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const paypalRef = (txnId: string) => `paypal:${txnId}`;

type Result = "recorded" | "duplicate" | "refunded" | "ignored";

/**
 * Handles one notification PayPal has already confirmed as genuine (see verifyPayPalNotification).
 * Completed payments to this store's PayPal account become orders, once; refunds and reversals
 * mark the order Refunded. Anything else (another account, pending, echeck) is ignored.
 */
export async function handlePayPalNotification(p: URLSearchParams): Promise<Result> {
  const us = paypalEmail()?.toLowerCase();
  const receiver = (p.get("receiver_email") ?? p.get("business") ?? "").toLowerCase();
  if (!us || receiver !== us) return "ignored";
  const sb = getServiceSupabase();
  const status = p.get("payment_status");

  if (status === "Refunded" || status === "Reversed") {
    const parent = p.get("parent_txn_id");
    if (sb && parent) await sb.from("orders").update({ status: "refunded" }).eq("stripe_session_id", paypalRef(parent));
    return "refunded";
  }
  const txn = p.get("txn_id");
  if (status !== "Completed" || !txn) return "ignored";
  if (!sb) return "ignored"; // no database: PayPal's own email to the seller is the record
  const { data: existing } = await sb.from("orders").select("id").eq("stripe_session_id", paypalRef(txn)).maybeSingle();
  if (existing) return "duplicate";

  // Re-price the order from the catalogue: what the buyer should have paid.
  const { products, zones, settings } = await getStoreData();
  const count = Number(p.get("num_cart_items") ?? "0") || [...p.keys()].filter((k) => /^item_number\d+$/.test(k)).length;
  const lines: { name: string; size: string | null; quantity: number; unitCents: number; productId: string | null; variantId: string | null; color: string | null }[] = [];
  let expectedSubtotal = 0;
  for (let i = 1; i <= count; i++) {
    const variantId = p.get(`item_number${i}`) ?? "";
    const quantity = Math.max(1, parseInt(p.get(`quantity${i}`) ?? "1", 10) || 1);
    const product = products.find((x) => x.variants.some((v) => v.id === variantId));
    const variant = product?.variants.find((v) => v.id === variantId);
    const listed = p.get(`item_name${i}`) ?? "Item";
    const paidLine = toCents(p.get(`mc_gross_${i}`));
    const unit = product?.priceCents ?? Math.round(paidLine / quantity);
    expectedSubtotal += unit * quantity;
    lines.push({
      name: product?.name ?? listed.replace(/\s+—\s+Size .*$/, ""),
      size: variant?.size ?? listed.match(/Size (.+)$/)?.[1] ?? null,
      quantity,
      unitCents: unit,
      productId: product?.id ?? null,
      variantId: variant && UUID.test(variant.id) ? variant.id : null,
      color: product?.color ?? null,
    });
  }
  const [ref, paidCountry] = (p.get("custom") ?? "").split("|");
  const shipCountry = (p.get("address_country_code") ?? "").toUpperCase();
  const zone = zoneFor(zones, shipCountry || paidCountry || "");
  const expectedTotal = expectedSubtotal + (zone ? shippingCents(zone, expectedSubtotal) : 0);
  const paid = toCents(p.get("mc_gross"));
  const currency = (p.get("mc_currency") ?? "USD").toLowerCase();

  const notes: string[] = [];
  if (currency !== settings.currency.toLowerCase()) notes.push(`Paid in ${currency.toUpperCase()}, not ${settings.currency.toUpperCase()}.`);
  if (paid + 1 < expectedTotal) notes.push(`Paid ${(paid / 100).toFixed(2)} but the order comes to ${(expectedTotal / 100).toFixed(2)}. Don’t ship until it’s sorted.`);
  if (paidCountry && shipCountry && paidCountry !== shipCountry) notes.push(`Shipping was paid for ${paidCountry} but the address is in ${shipCountry}. Check the shipping cost before sending.`);

  const street = (p.get("address_street") ?? "").split(/\r?\n/);
  const shippingCentsPaid = toCents(p.get("mc_shipping")) + toCents(p.get("mc_handling"));
  const tax = toCents(p.get("tax"));
  const row = {
    stripe_session_id: paypalRef(txn),
    stripe_payment_intent: txn,
    livemode: paypalMode() === "live",
    email: p.get("payer_email"),
    phone: p.get("contact_phone"),
    status: "paid",
    currency,
    subtotal_cents: Math.max(0, paid - shippingCentsPaid - tax),
    shipping_cents: shippingCentsPaid,
    tax_cents: tax,
    discount_cents: 0,
    total_cents: paid,
    shipping_name: p.get("address_name") ?? ([p.get("first_name"), p.get("last_name")].filter(Boolean).join(" ") || null),
    shipping_address: {
      line1: street[0] || null,
      line2: street.slice(1).join(", ") || null,
      city: p.get("address_city"),
      state: p.get("address_state"),
      postal_code: p.get("address_zip"),
      country: shipCountry || null,
    },
  };
  const extra = { payment_provider: "paypal", note: notes.join(" ") || null, checkout_ref: ref && UUID.test(ref) ? ref : null };
  let { data: order, error } = await sb.from("orders").insert({ ...row, ...extra }).select("id, order_number").single();
  // A database from before these columns existed still records the order.
  if (error && /column|schema cache/i.test(error.message ?? "")) {
    ({ data: order, error } = await sb.from("orders").insert(row).select("id, order_number").single());
  }
  if (error || !order) {
    if (error?.code === "23505") return "duplicate";
    throw new Error(`order insert failed: ${error?.message}`);
  }

  let stockIssue = false;
  for (const l of lines) {
    await sb.from("order_items").insert({
      order_id: order.id,
      product_id: l.productId,
      variant_id: l.variantId,
      name: l.name,
      size: l.size,
      color: l.color,
      unit_price_cents: l.unitCents,
      quantity: l.quantity,
    });
    if (row.livemode && l.variantId) {
      const { data: ok, error: rpcError } = await sb.rpc("decrement_stock", { p_variant: l.variantId, p_qty: l.quantity });
      if (rpcError || ok !== true) stockIssue = true;
    }
  }
  if (stockIssue) await sb.from("orders").update({ stock_issue: true }).eq("id", order.id);

  if (row.email) {
    const mail = orderConfirmationEmail({
      orderNumber: order.order_number,
      lines: lines.map((l) => ({ name: l.name, size: l.size, quantity: l.quantity, unitCents: l.unitCents })),
      totalCents: paid,
      currency,
    });
    await sendEmail({ to: row.email, ...mail });
  }
  return "recorded";
}

/** The confirmation page after PayPal sends the buyer back: paid once PayPal's confirmation arrived. */
export async function confirmPayPalReturn(ref: string | undefined): Promise<{ paid: boolean; email: string | null; orderNumber: string | null }> {
  const none = { paid: false, email: null, orderNumber: null };
  const sb = getServiceSupabase();
  if (!sb || !ref || !UUID.test(ref)) return none;
  const { data, error } = await sb.from("orders").select("order_number, email, status").eq("checkout_ref", ref).maybeSingle();
  if (error || !data || data.status === "refunded" || data.status === "canceled") return none;
  return { paid: true, email: data.email ?? null, orderNumber: data.order_number };
}
