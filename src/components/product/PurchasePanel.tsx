"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/providers/CartProvider";
import { useStore } from "@/components/providers/StoreProvider";
import { useUI } from "@/components/providers/UIProvider";
import { CheckIcon, GlobeIcon, LockIcon, MinusIcon, PlusIcon } from "@/components/ui/Icons";
import { Overlay } from "@/components/ui/Overlay";
import {
  isBuyable,
  LOW_STOCK_AT,
  MAX_PER_LINE,
  productAvailability,
  variantAvailability,
} from "@/lib/shared/commerce";
import { familyKey } from "@/lib/shared/colorways";
import { sizeRank } from "@/lib/shared/filters";
import { parseSizeGuide } from "@/lib/shared/sizechart";
import { formatPrice } from "@/lib/shared/format";
import { shippableCountries } from "@/lib/shared/shipping";
import type { Product } from "@/lib/shared/types";
import { ContactEmail, WishlistButton } from "./bits";
import { NotifyForm } from "./NotifyForm";

export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  compact = false,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
  compact?: boolean;
}) {
  const h = compact ? "h-9" : "h-11";
  return (
    <div className={`inline-flex items-center border border-rule ${h}`} role="group" aria-label={label}>
      <button
        type="button"
        className={`grid ${h} w-10 place-items-center disabled:opacity-30`}
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Decrease quantity"
      >
        <MinusIcon size={14} />
      </button>
      <output className="w-8 text-center text-[0.8125rem] tabular-nums" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={`grid ${h} w-10 place-items-center disabled:opacity-30`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <PlusIcon size={14} />
      </button>
    </div>
  );
}

/** The admin's size guide: pasted measurement tables become a real table, other lines notes. */
export function SizeChart({ text, selected }: { text: string | null; selected?: string | null }) {
  const blocks = parseSizeGuide(text);
  if (!blocks.length) {
    return (
      <p className="muted">
        Unisex sizing. Email <ContactEmail /> with your usual size and we’ll help you choose.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((b, i) =>
        b.kind === "note" ? (
          <p key={i} className="muted text-[0.8125rem] leading-relaxed">
            {b.text}
          </p>
        ) : (
          <div key={i} className="-mx-1 overflow-x-auto">
            <table className="size-table">
              <thead>
                <tr>
                  {b.head.map((h, j) => (
                    <th key={j} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={j} data-selected={selected != null && r[0]?.toUpperCase() === selected.toUpperCase()}>
                    {r.map((c, k) =>
                      k === 0 ? (
                        <th key={k} scope="row">
                          {c}
                        </th>
                      ) : (
                        <td key={k}>{c}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}

export function SizeGuide({ product, selected }: { product: Product; selected?: string | null }) {
  const [open, setOpen] = useState(false);
  // Nothing to put in the guide yet: the Size & fit section below covers sizing help instead.
  if (!product.sizeGuide?.trim() && !product.fit?.trim()) return null;
  return (
    <>
      <button type="button" className="text-link text-[0.75rem] muted" onClick={() => setOpen(true)}>
        Size guide
      </button>
      <Overlay open={open} onClose={() => setOpen(false)} label="Size guide" variant="dialog" className="max-w-xl">
        <div className="p-8 md:p-10">
          <div className="flex items-start justify-between gap-6">
            <h2 className="text-xl font-light">Size guide</h2>
            <button type="button" className="caps" onClick={() => setOpen(false)} data-autofocus>
              Close
            </button>
          </div>
          <p className="mt-2 text-[0.8125rem] muted">{product.name}</p>
          <div className="mt-6 text-[0.9375rem] leading-relaxed">
            <SizeChart text={product.sizeGuide} selected={selected} />
            {product.fit && <p className="mt-6 text-[0.875rem]">{product.fit}</p>}
          </div>
        </div>
      </Overlay>
    </>
  );
}

/** The size last chosen, so switching to another colour of the same piece keeps it selected. */
let carriedSize: { family: string; size: string } | null = null;

export function PurchasePanel({
  product,
  onAdded,
  sticky = false,
}: {
  product: Product;
  onAdded?: () => void;
  /** Product pages: show the buy bar on phones while the buttons are off screen. */
  sticky?: boolean;
}) {
  const { settings, content, zones, commerce } = useStore();
  const cart = useCart();
  const ui = useUI();
  const router = useRouter();
  const groupId = useId();
  const variants = useMemo(
    () => [...product.variants].sort((a, b) => sizeRank(a.size) - sizeRank(b.size)),
    [product.variants],
  );
  const [variantId, setVariantId] = useState<string | null>(() => {
    if (variants.length === 1) return variants[0].id;
    if (carriedSize?.family !== familyKey(product)) return null;
    const same = variants.find((v) => v.size === carriedSize?.size);
    return same && isBuyable(variantAvailability(product, same, settings)) ? same.id : null;
  });
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const actions = useRef<HTMLDivElement>(null);
  const sizePicker = useRef<HTMLFieldSetElement>(null);

  // Phones: the buy bar shows whenever the real buttons are off screen.
  useEffect(() => {
    if (!sticky || !actions.current || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setBarVisible(!entry.isIntersecting), { threshold: 0 });
    io.observe(actions.current);
    return () => io.disconnect();
  }, [sticky]);
  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(false), 1800);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  const productState = productAvailability(product, settings);
  const buyable = isBuyable(productState);
  const variant = variants.find((v) => v.id === variantId) ?? null;
  const inCart = variant
    ? (cart.rawLines.find((l) => l.productId === product.id && l.variantId === variant.id)?.quantity ?? 0)
    : 0;
  const maxQty = variant ? Math.max(0, Math.min(variant.stock, MAX_PER_LINE) - inCart) : 1;

  const add = (thenCheckout: boolean) => {
    if (!buyable) return;
    if (!variant) {
      setError("Select a size to continue.");
      return;
    }
    if (!isBuyable(variantAvailability(product, variant, settings))) {
      setError("That size is sold out.");
      return;
    }
    if (maxQty <= 0) {
      setError(`You already have all ${variant.stock} available in your bag.`);
      return;
    }
    const n = Math.min(qty, maxQty);
    cart.add(product.id, variant.id, n);
    setError(null);
    setQty(1);
    setJustAdded(true);
    onAdded?.();
    if (thenCheckout) {
      router.push("/checkout");
    } else {
      ui.open("cart");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Size */}
      <fieldset ref={sizePicker}>
        <div className="mb-3 flex items-baseline justify-between">
          <legend className="text-[0.75rem] uppercase tracking-[0.12em]">
            Size{variant ? <span className="muted">: {variant.size}</span> : null}
          </legend>
          <SizeGuide product={product} selected={variant?.size} />
        </div>
        {variants.length === 0 ? (
          <p className="muted text-[0.8125rem]">Sizes coming soon.</p>
        ) : (
          <div role="radiogroup" aria-labelledby={groupId} className="flex flex-wrap gap-2">
            <span id={groupId} className="sr-only">
              Choose a size
            </span>
            {variants.map((v) => {
              const va = variantAvailability(product, v, settings);
              const soldOut = buyable && va === "sold_out";
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={variantId === v.id}
                  disabled={soldOut}
                  onClick={() => {
                    setVariantId(v.id);
                    carriedSize = { family: familyKey(product), size: v.size };
                    setQty(1);
                    setError(null);
                  }}
                  className="size-option"
                  aria-label={`${v.size}${soldOut ? ", sold out" : ""}`}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
        )}
        {buyable && variant && variant.stock > 0 && variant.stock <= LOW_STOCK_AT && (
          <p className="mt-3 text-[0.8125rem] muted">Only {variant.stock} left in this size.</p>
        )}
      </fieldset>

      <div ref={actions} className="flex flex-col gap-6">
      {buyable ? (
        <>
          <div className="flex items-center gap-4">
            <QuantityStepper
              label="Quantity"
              value={qty}
              max={Math.max(1, maxQty)}
              onChange={(n) => setQty(Math.max(1, Math.min(n, Math.max(1, maxQty))))}
            />
            <span className="muted text-[0.75rem]">Quantity</span>
          </div>
          <div className="flex flex-col gap-3">
            <button type="button" className="btn btn-solid btn-block" onClick={() => add(false)} aria-live="polite">
              {justAdded ? (
                <>
                  <CheckIcon size={16} /> Added to bag
                </>
              ) : (
                "Add to bag"
              )}
            </button>
            <button type="button" className="btn btn-line btn-block" onClick={() => add(true)}>
              Buy now
            </button>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </div>
        </>
      ) : (
        <NotifyForm productSlug={product.slug} productName={product.name} soldOut={productState === "sold_out"} />
      )}
      </div>
      <WishlistButton product={product} withLabel className="btn-block" />
      {buyable && (
        <ul className="muted flex flex-col gap-2.5 text-[0.75rem]">
          <li className="flex items-center gap-2.5">
            <LockIcon size={15} /> Secure checkout{commerce.processor ? ` by ${commerce.processor}` : ""}. {commerce.methods ?? content.payment_methods_note}
          </li>
          {zones.some((z) => z.isActive) && (
            <li className="flex items-center gap-2.5">
              <GlobeIcon size={15} />
              {zones.some((z) => z.isActive && z.countries.includes("*"))
                ? "Ships worldwide."
                : `Ships to ${shippableCountries(zones).length} countries.`}{" "}
              <Link href="/info/shipping" className="text-link">Rates</Link>
            </li>
          )}
        </ul>
      )}
      {sticky && (
        <div className="buy-bar" data-show={barVisible} aria-hidden={!barVisible}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem]">{product.name}</p>
            <p className="muted text-[0.75rem] tabular-nums">
              {product.priceCents != null ? formatPrice(product.priceCents, settings.currency) : "Coming soon"}
              {variant ? ` · ${variant.size}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-solid min-h-[44px] px-5"
            tabIndex={barVisible ? 0 : -1}
            onClick={() => {
              if (buyable && variant) return add(false);
              const target = buyable ? sizePicker.current : actions.current;
              target?.scrollIntoView({ behavior: "smooth", block: "center" });
              if (buyable) setError("Select a size to continue.");
            }}
          >
            {buyable ? (variant ? (justAdded ? "Added" : "Add to bag") : "Select size") : "Notify me"}
          </button>
        </div>
      )}
    </div>
  );
}
