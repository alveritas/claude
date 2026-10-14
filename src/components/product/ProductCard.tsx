"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/providers/CartProvider";
import { useStore } from "@/components/providers/StoreProvider";
import { useUI } from "@/components/providers/UIProvider";
import { ExpandIcon } from "@/components/ui/Icons";
import { colorwayLabel, familyOf, styleName } from "@/lib/shared/colorways";
import { combineTallies } from "@/lib/shared/reviews";
import { availabilityLabel, isBuyable, productAvailability, variantAvailability } from "@/lib/shared/commerce";
import { sizeRank } from "@/lib/shared/filters";
import type { Product } from "@/lib/shared/types";
import { BrandName, PriceText, WishlistButton } from "./bits";
import { ProductImage } from "./ProductImage";
import { RatingLine } from "./Reviews";
import { SwatchButtons } from "./Swatches";

/**
 * One card per piece. When a piece comes in several colours, the dots under it switch the photo,
 * price, sizes and link in place; `product` is the colour shown first.
 */
export function ProductCard({
  product,
  members: given,
  priority = false,
  feature = false,
  sizes = "(min-width: 1024px) 25vw, 50vw",
}: {
  product: Product;
  /** Every colourway of this piece. Worked out from the catalogue when not given. */
  members?: Product[];
  priority?: boolean;
  /** Large first tile on the homepage: fills a 2×2 cell on desktop. */
  feature?: boolean;
  sizes?: string;
}) {
  const { settings, products, ratings } = useStore();
  const { openQuickView, open } = useUI();
  const cart = useCart();
  const members = useMemo(() => given ?? familyOf(product, products), [given, product, products]);
  const [selectedId, setSelectedId] = useState(product.id);
  useEffect(() => setSelectedId(product.id), [product.id]);
  const shown = members.find((m) => m.id === selectedId) ?? product;

  const a = productAvailability(shown, settings);
  const buyable = isBuyable(a);
  const href = `/products/${shown.slug}`;
  const sizes_ = useMemo(() => [...shown.variants].sort((x, y) => sizeRank(x.size) - sizeRank(y.size)), [shown.variants]);
  const grouped = members.length > 1;
  const quickAdd = (variantId: string) => {
    cart.add(shown.id, variantId, 1);
    open("cart");
  };

  return (
    <article className={`card group relative ${feature ? "lg:flex lg:h-full lg:flex-col" : ""}`}>
      <div className={`frame aspect-[4/5] ${feature ? "lg:aspect-auto lg:min-h-0 lg:flex-1" : ""}`}>
        <Link href={href} className="absolute inset-0 block" aria-label={shown.name} tabIndex={-1}>
          {members.map((m) => {
            const on = m.id === shown.id;
            // The large homepage tile leads with the piece being worn; the flat shot shows on hover.
            const worn = feature ? m.images.find((im) => /model/i.test(im.label)) : undefined;
            const [first, second] = worn ? [worn, m.images.find((im) => im !== worn)] : m.images;
            return (
              <span key={m.id} className="cw-layer" data-on={on} aria-hidden={on ? undefined : true}>
                {first && <ProductImage image={first} sizes={sizes} priority={priority && m.id === product.id} />}
                {on && second && <ProductImage image={second} sizes={sizes} className="img-alt" />}
              </span>
            );
          })}
        </Link>
        {(a === "sold_out" || a === "low_stock" || a === "coming_soon") && (
          <span className="tag pointer-events-none absolute left-2 top-2 md:left-3 md:top-3">{availabilityLabel(a)}</span>
        )}
        <WishlistButton product={shown} className="absolute right-1 top-1" />
        {buyable && sizes_.length > 0 ? (
          <div className="quick-add" role="group" aria-label={`Quick add ${shown.name}`}>
            <span className="caps muted">Quick add</span>
            <div className="flex flex-wrap gap-1.5">
              {sizes_.map((v) => {
                const soldOut = !isBuyable(variantAvailability(shown, v, settings));
                return (
                  <button
                    key={v.id}
                    type="button"
                    className="qa-size"
                    disabled={soldOut}
                    onClick={() => quickAdd(v.id)}
                    aria-label={`Add ${shown.name}, size ${v.size}, to bag${soldOut ? " (sold out)" : ""}`}
                  >
                    {v.size}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openQuickView(shown.id)}
            className="caps absolute inset-x-3 bottom-3 hidden h-10 items-center justify-center bg-ink/80 backdrop-blur-sm transition-opacity duration-300 md:flex md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            Quick view
          </button>
        )}
        <button
          type="button"
          onClick={() => openQuickView(shown.id)}
          aria-label={`Quick view: ${shown.name}`}
          className="icon-btn absolute bottom-1 right-1 md:hidden"
        >
          <ExpandIcon size={16} />
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <h3 className="card-title">
          <Link href={href} className="hover:opacity-70">
            <BrandName name={styleName(shown, members)} />
          </Link>
        </h3>
        <PriceText product={shown} className="text-[0.8125rem]" />
        <RatingLine tally={combineTallies(members.map((m) => ratings[m.id]))} />
        {grouped ? (
          <div className="-ml-1 flex items-center gap-2">
            <SwatchButtons
              members={members}
              currentId={shown.id}
              onPick={setSelectedId}
              label={`Colors of ${styleName(shown, members)}`}
            />
            <span className="muted text-[0.75rem]" aria-live="polite">
              {colorwayLabel(shown)}
            </span>
          </div>
        ) : (
          shown.color && <span className="muted text-[0.75rem]">{shown.color}</span>
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[4/5]" />
      <div className="skeleton mt-3 h-4 w-3/4" />
      <div className="skeleton mt-2 h-3 w-1/2" />
    </div>
  );
}
