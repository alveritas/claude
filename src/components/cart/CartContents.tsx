"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { QuantityStepper } from "@/components/product/PurchasePanel";
import { useCart } from "@/components/providers/CartProvider";
import { useStore } from "@/components/providers/StoreProvider";
import { MAX_PER_LINE } from "@/lib/shared/commerce";
import { countryName } from "@/lib/shared/countries";
import { dayRange, shippableCountries, shippingCents as shippingFor, zoneFor } from "@/lib/shared/shipping";
import { formatPrice } from "@/lib/shared/format";

export function CartLines({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const { lines, setQuantity, remove } = useCart();
  const { settings } = useStore();
  return (
    <ul className="divide-y divide-rule">
      {lines.map((r) => {
        const img = r.product.images[0];
        const href = `/products/${r.product.slug}`;
        return (
          <li key={`${r.product.id}:${r.variant.id}`} className="flex gap-4 py-5">
            <Link href={href} onClick={onNavigate} className={`frame flex-none ${compact ? "h-28 w-21" : "h-36 w-27"}`}>
              {img && (
                <Image src={img.url} alt={img.alt} fill sizes="108px" className="object-cover" style={{ objectPosition: img.focal }} />
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <Link href={href} onClick={onNavigate} className="text-[0.875rem] leading-snug hover:opacity-70">
                  {r.product.name}
                </Link>
                <span className="text-[0.8125rem] tabular-nums">
                  {r.lineCents == null ? "Price to come" : formatPrice(r.lineCents, settings.currency)}
                </span>
              </div>
              <p className="muted mt-1 text-[0.75rem]">
                Size {r.variant.size}
                {r.product.color ? ` / ${r.product.color}` : ""}
              </p>
              {r.problem && <p className="form-error mt-1">{r.problem}</p>}
              <div className="mt-auto flex items-center justify-between pt-3">
                <QuantityStepper
                  compact
                  label={`Quantity for ${r.product.name}`}
                  value={r.line.quantity}
                  max={Math.min(MAX_PER_LINE, Math.max(r.variant.stock, 1))}
                  onChange={(n) => setQuantity(r.product.id, r.variant.id, Math.max(1, n))}
                />
                <button
                  type="button"
                  className="text-link muted text-[0.75rem]"
                  onClick={() => remove(r.product.id, r.variant.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Bag totals and the way into checkout, where the shopper enters their details and pays. */
export function CheckoutBox({ onNavigate }: { onNavigate?: () => void }) {
  const { lines, subtotalCents, country, setCountry } = useCart();
  const { settings, zones, commerce, content } = useStore();

  const countries = useMemo(
    () =>
      shippableCountries(zones)
        .map((code) => ({ code, name: countryName(code) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [zones],
  );
  const zone = zoneFor(zones, country);
  const validCountry = Boolean(zone);
  const blocked = lines.some((l) => l.problem && !l.problem.startsWith("Only"));
  const unpriced = lines.some((l) => l.unitCents == null);
  const shippingCents = zone == null ? null : shippingFor(zone, subtotalCents);
  const delivery = zone ? dayRange(zone.minDays, zone.maxDays) : null;

  const canCheckout = commerce.checkoutEnabled && !blocked && !unpriced && lines.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="ship-country" className="label">
          Shipping to
        </label>
        {countries.length ? (
          <select
            id="ship-country"
            className="select w-full"
            value={validCountry ? country! : ""}
            onChange={(e) => setCountry(e.target.value || null)}
          >
            <option value="">Choose a country</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="muted text-[0.8125rem]">Shipping destinations aren’t open yet.</p>
        )}
        {delivery && <p className="muted mt-2 text-[0.75rem]">Estimated delivery: {delivery} after dispatch.</p>}
        {zone && country && zone.freeOverCents != null && zone.rateCents > 0 && subtotalCents > 0 && (
          <FreeShippingMeter subtotalCents={subtotalCents} thresholdCents={zone.freeOverCents} country={country} currency={settings.currency} />
        )}
      </div>

      <dl className="flex flex-col gap-2 border-t border-rule pt-5 text-[0.875rem]">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{unpriced && subtotalCents === 0 ? "—" : formatPrice(subtotalCents, settings.currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="muted">Shipping</dt>
          <dd className="muted tabular-nums">
            {shippingCents == null ? "Calculated at checkout" : shippingCents === 0 ? "Free" : formatPrice(shippingCents, settings.currency)}
          </dd>
        </div>
        {settings.automaticTax && (
          <div className="flex justify-between">
            <dt className="muted">Tax</dt>
            <dd className="muted">Calculated at checkout</dd>
          </div>
        )}
      </dl>

      {settings.allowPromotionCodes && (
        <p className="muted text-[0.75rem]">Have a promotion code? You can enter it at checkout.</p>
      )}

      {canCheckout ? (
        <Link href="/checkout" onClick={onNavigate} className="btn btn-solid btn-block">
          Checkout
        </Link>
      ) : (
        <button type="button" className="btn btn-solid btn-block" disabled>
          Checkout
        </button>
      )}
      {!commerce.checkoutEnabled && commerce.message && (
        <p className="muted text-[0.8125rem]" role="status">
          {commerce.message}
        </p>
      )}
      {commerce.checkoutEnabled && blocked && (
        <p className="form-error">Remove the items that can’t be bought before checking out.</p>
      )}
      {commerce.checkoutEnabled && (commerce.methods ?? content.payment_methods_note) && (
        <p className="muted -mt-2 text-center text-[0.75rem]">{commerce.methods ?? content.payment_methods_note}</p>
      )}
      {commerce.checkoutEnabled && commerce.testMode && (
        <p className="border border-rule px-3 py-2 text-[0.75rem] leading-relaxed" role="note">
          Test mode: no real payments are taken. Pay with card 4242 4242 4242 4242, any future date and any CVC.
        </p>
      )}
      {commerce.checkoutEnabled && content.checkout_note && (
        <p className="text-[0.75rem] leading-relaxed">{content.checkout_note}</p>
      )}
      {countries.length > 0 && <p className="muted text-[0.6875rem] leading-relaxed">{content.duties_disclosure}</p>}
    </div>
  );
}

/** "$15 away from free shipping to the United States", with a thin progress line. */
function FreeShippingMeter({
  subtotalCents,
  thresholdCents,
  country,
  currency,
}: {
  subtotalCents: number;
  thresholdCents: number;
  country: string;
  currency: string;
}) {
  const pct = Math.min(100, Math.round((subtotalCents / thresholdCents) * 100));
  const reached = subtotalCents >= thresholdCents;
  return (
    <div className="mt-4">
      <p className="text-[0.75rem]">
        {reached
          ? `Free shipping to ${countryName(country)} unlocked.`
          : `${formatPrice(thresholdCents - subtotalCents, currency)} away from free shipping to ${countryName(country)}.`}
      </p>
      <div
        className="ship-meter mt-2"
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
    </div>
  );
}

export function EmptyBag({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-6 py-10">
      <p className="text-[1.125rem] font-light">Your bag is empty.</p>
      <Link href="/shop" onClick={onNavigate} className="btn btn-line">
        Explore the collection
      </Link>
    </div>
  );
}
