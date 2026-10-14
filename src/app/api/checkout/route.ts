import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getSessionUser } from "@/lib/server/auth";
import { getStoreData } from "@/lib/server/catalog";
import { siteUrl } from "@/lib/server/env";
import { activeProvider, paymentsReady } from "@/lib/server/payments";
import { getCommerceStatus } from "@/lib/server/readiness";
import { paypalCheckoutUrl } from "@/lib/server/paypal";
import { createSquareCheckout, type SquareCheckoutLine } from "@/lib/server/square";
import { getStripe } from "@/lib/server/stripe";
import { getServiceSupabase } from "@/lib/server/supabase";
import { isBuyable, MAX_PER_LINE, variantAvailability } from "@/lib/shared/commerce";
import { shippingCents, zoneFor } from "@/lib/shared/shipping";

export const dynamic = "force-dynamic";

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ ok: false, code, message }, { status });

/**
 * Opens the payment page for the bag: Square's checkout (or Stripe's, if that's the one set up).
 * Every price, size and stock level is re-read from the database here; nothing the browser
 * sends is trusted except ids and quantities.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const rawLines: unknown[] = Array.isArray(body?.lines) ? body.lines.slice(0, 50) : [];
  const country = typeof body?.country === "string" ? body.country.toUpperCase() : "";

  const [{ products, settings, zones, content }, ready] = await Promise.all([getStoreData(), paymentsReady()]);
  const status = getCommerceStatus(settings, zones, ready);
  const provider = activeProvider();
  const stripe = provider === "stripe" ? getStripe() : null;
  if (!status.checkoutEnabled || !provider || (provider === "stripe" && !stripe)) {
    return fail("checkout_disabled", status.message ?? "Checkout isn’t available yet.", 503);
  }

  const zone = zoneFor(zones, country);
  if (!zone) return fail("unsupported_destination", "We don’t ship to that destination yet.");

  // Merge duplicate lines, validate each against live data.
  const merged = new Map<string, { productId: string; variantId: string; quantity: number }>();
  for (const l of rawLines) {
    const line = l as { productId?: unknown; variantId?: unknown; quantity?: unknown };
    if (typeof line.productId !== "string" || typeof line.variantId !== "string") continue;
    const q = Number(line.quantity);
    if (!Number.isInteger(q) || q < 1) continue;
    const key = `${line.productId}:${line.variantId}`;
    const prev = merged.get(key);
    merged.set(key, { productId: line.productId, variantId: line.variantId, quantity: (prev?.quantity ?? 0) + q });
  }
  if (!merged.size) return fail("empty", "Your bag is empty.");

  const base = siteUrl();
  const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const squareLines: SquareCheckoutLine[] = [];
  let subtotal = 0;
  for (const line of merged.values()) {
    const product = products.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (!product || !variant) return fail("unavailable", "Something in your bag is no longer available. Refresh and try again.", 409);
    if (!isBuyable(variantAvailability(product, variant, settings)) || product.priceCents == null) {
      return fail("unavailable", `${product.name} (${variant.size}) can’t be bought right now.`, 409);
    }
    if (line.quantity > Math.min(variant.stock, MAX_PER_LINE)) {
      return fail("insufficient_stock", `Only ${Math.min(variant.stock, MAX_PER_LINE)} of ${product.name} in ${variant.size} available.`, 409);
    }
    subtotal += product.priceCents * line.quantity;
    squareLines.push({
      name: product.name,
      size: variant.size,
      color: product.color,
      quantity: line.quantity,
      unitCents: product.priceCents,
      productId: product.id,
      variantId: variant.id,
    });
    const image = product.images[0]?.url;
    const imageUrl = image ? (image.startsWith("http") ? image : `${base}${image}`) : null;
    items.push({
      quantity: line.quantity,
      price_data: {
        currency: settings.currency,
        unit_amount: product.priceCents,
        product_data: {
          name: `NEVERHOLLOW ${product.name}`,
          description: [`Size ${variant.size}`, product.color].filter(Boolean).join(" · "),
          images: imageUrl && imageUrl.startsWith("https://") ? [imageUrl] : undefined,
          metadata: { product_id: product.id, variant_id: variant.id, size: variant.size, color: product.color ?? "" },
        },
      },
    });
  }

  const shippingAmount = shippingCents(zone, subtotal);
  const session = await getSessionUser();

  if (provider === "paypal") {
    // PayPal's own page: card or PayPal. The order is recorded when PayPal confirms the payment.
    const ref = crypto.randomUUID();
    const url = paypalCheckoutUrl({
      ref,
      lines: squareLines.map((l) => ({ name: l.name, size: l.size, quantity: l.quantity, unitCents: l.unitCents, variantId: l.variantId })),
      currency: settings.currency,
      shippingCents: shippingAmount,
      country,
      email: session?.user.email ?? null,
    });
    return NextResponse.json({ ok: true, data: { url } });
  }

  if (provider === "square") {
    // A reference for this checkout, so the confirmation page can find the order on return.
    const ref = crypto.randomUUID();
    try {
      const link = await createSquareCheckout({
        ref,
        lines: squareLines,
        currency: settings.currency,
        shipping: { name: `Shipping — ${zone.name}`, cents: shippingAmount },
        country,
        zoneId: zone.id,
        email: session?.user.email ?? null,
        userId: session?.user.id ?? null,
        supportEmail: settings.contactEmail,
        redirectUrl: `${base}/checkout/success?ref=${ref}`,
      });
      await getServiceSupabase()
        ?.from("checkout_refs")
        .insert({ ref, provider: "square", provider_order_id: link.orderId })
        .then(
          () => undefined,
          () => undefined,
        );
      return NextResponse.json({ ok: true, data: { url: link.url } });
    } catch (e) {
      console.error("Square checkout failed", e);
      return fail("payment_error", "Checkout couldn’t be opened. Try again in a moment.", 502);
    }
  }
  if (!stripe) return fail("checkout_disabled", "Checkout isn’t available yet.", 503);
  const estimate: Stripe.Checkout.SessionCreateParams.ShippingOption.ShippingRateData.DeliveryEstimate = {};
  if (zone.minDays != null) estimate.minimum = { unit: "business_day", value: zone.minDays };
  if (zone.maxDays != null) estimate.maximum = { unit: "business_day", value: zone.maxDays };

  const checkoutTerms = [content.checkout_note, content.duties_disclosure]
    .map((t) => t.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 1200);
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items,
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/cart`,
      // Only the destination chosen in the bag, so the rate charged always matches the address.
      shipping_address_collection: {
        allowed_countries: [country as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: shippingAmount === 0 ? `Free shipping — ${zone.name}` : `Shipping — ${zone.name}`,
            fixed_amount: { amount: shippingAmount, currency: settings.currency },
            ...(Object.keys(estimate).length ? { delivery_estimate: estimate } : {}),
          },
        },
      ],
      allow_promotion_codes: settings.allowPromotionCodes || undefined,
      automatic_tax: { enabled: settings.automaticTax },
      phone_number_collection: { enabled: true },
      // Final-sale and duties terms, shown above the pay button.
      ...(checkoutTerms ? { custom_text: { submit: { message: checkoutTerms } } } : {}),
      ...(session
        ? { customer_email: session.user.email ?? undefined, client_reference_id: session.user.id }
        : {}),
      metadata: { zone_id: zone.id, country },
    });
    if (!checkout.url) return fail("stripe_error", "Checkout couldn’t be opened. Try again.", 502);
    return NextResponse.json({ ok: true, data: { url: checkout.url } });
  } catch (e) {
    console.error("Stripe checkout session failed", e);
    return fail("stripe_error", "Checkout couldn’t be opened. Try again in a moment.", 502);
  }
}
