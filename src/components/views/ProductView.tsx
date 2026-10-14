"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandName, ContactEmail, PriceText } from "@/components/product/bits";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { PurchasePanel, SizeChart } from "@/components/product/PurchasePanel";
import { ColorwayTiles } from "@/components/product/Swatches";
import { useStore } from "@/components/providers/StoreProvider";
import { PlusIcon } from "@/components/ui/Icons";
import { RatingLine, ReviewsSection } from "@/components/product/Reviews";
import { useRecentlyViewed } from "@/lib/client/hooks";
import { colorwayLabel, familyKey, familyOf, groupFamilies, styleName } from "@/lib/shared/colorways";
import { availabilityLabel, productAvailability } from "@/lib/shared/commerce";
import { combineTallies } from "@/lib/shared/reviews";
import { CATEGORY_LABELS, type Product, type Review } from "@/lib/shared/types";

function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="acc border-b border-rule" open={open}>
      <summary>
        {title}
        <PlusIcon size={14} className="acc-icon" />
      </summary>
      <div className="acc-body">{children}</div>
    </details>
  );
}

export function ProductView({ product, reviews = [] }: { product: Product; reviews?: Review[] }) {
  const { products, settings, content, ratings } = useStore();
  const a = productAvailability(product, settings);
  const members = familyOf(product, products);
  const grouped = members.length > 1;
  const title = styleName(product, members);
  // Reviews cover the whole piece: every colour shares them, each one saying what was bought.
  const tally = combineTallies(members.map((m) => ratings[m.id]));
  const key = familyKey(product);
  // Other pieces only: this piece's other colours are already one tap away above.
  const others = products.filter((p) => familyKey(p) !== key);
  const related = groupFamilies(
    [...others].sort((x, y) => Number(y.collectionId === product.collectionId) - Number(x.collectionId === product.collectionId)),
    products,
  ).slice(0, 4);
  const recentIds = useRecentlyViewed(product.id);
  const recent = groupFamilies(
    recentIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p) && familyKey(p as Product) !== key),
    products,
  ).slice(0, 4);

  return (
    <div className="pb-24">
      <div className="shell pt-6 md:pt-10">
        <nav aria-label="Breadcrumb" className="muted text-[0.75rem]">
          <ol className="flex flex-wrap gap-2">
            <li>
              <Link href="/shop" className="hover:text-bone">
                Shop
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/shop?category=${product.category}`} className="hover:text-bone">
                {CATEGORY_LABELS[product.category]}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-bone">
              {title}
            </li>
          </ol>
        </nav>
      </div>

      <div className="shell mt-6 grid gap-10 md:mt-8 md:grid-cols-2 lg:gap-20">
        <div className="max-md:-mx-4">
          <ProductGallery images={product.images} title={product.name} priority />
        </div>

        <div className="md:sticky md:top-[calc(var(--hdr-h)+24px)] md:self-start">
          <h1 className="page-title">
            <BrandName name={title} />
          </h1>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[0.9375rem]">
            <PriceText product={product} />
            {(a !== "coming_soon" || product.priceCents != null) && (
              <span className="muted text-[0.8125rem]">{availabilityLabel(a)}</span>
            )}
          </div>
          {product.priceCents != null && (
            <p className="muted mt-1 text-[0.75rem]">Shipping is added at checkout.</p>
          )}
          {tally.count > 0 && (
            <div className="mt-3">
              <RatingLine tally={tally} href="#reviews" size={12} />
            </div>
          )}
          {(grouped || product.color) && (
            <p className="mt-5 text-[0.75rem] uppercase tracking-[0.12em]">
              Color
              <span className="muted">
                : {grouped ? colorwayLabel(product) : product.color}
                {grouped && product.color && product.color !== colorwayLabel(product) ? ` — ${product.color}` : ""}
              </span>
            </p>
          )}
          {grouped && (
            <div className="mt-3">
              <ColorwayTiles members={members} currentId={product.id} />
            </div>
          )}
          {product.description && <p className="muted mt-5 max-w-[52ch] text-[0.875rem] leading-relaxed">{product.description}</p>}

          <div className="mt-8">
            <PurchasePanel product={product} sticky />
          </div>

          <div className="mt-10 border-t border-rule">
            <Section title="Details">
              {product.composition || product.care ? (
                <>
                  {product.composition && <span className="block">{product.composition}</span>}
                  {product.care && <span className="mt-3 block">{product.care}</span>}
                </>
              ) : (
                <span className="muted">
                  Questions about fabric or care? Email <ContactEmail /> and we’ll answer before you order.
                </span>
              )}
            </Section>
            <Section title="Size & fit">
              {product.fit ?? (
                <span className="muted">
                  Unisex sizing. Not sure which size to get? Email <ContactEmail /> with your usual size and we’ll help you
                  choose.
                </span>
              )}
              {product.sizeGuide?.trim() && (
                <div className="mt-5 whitespace-normal">
                  <SizeChart text={product.sizeGuide} />
                </div>
              )}
            </Section>
            <Section title="Shipping & returns">
              {content.checkout_note}
              {"\n\n"}
              <Link href="/info/shipping" className="text-link text-bone">
                Shipping
              </Link>
              {"   "}
              <Link href="/info/returns" className="text-link text-bone">
                Returns
              </Link>
            </Section>
          </div>
        </div>
      </div>

      <ReviewsSection reviews={reviews} tally={tally} live={settings.mode === "live"} />

      {related.length > 0 && (
        <section aria-labelledby="related" className="shell mt-24 md:mt-36">
          <h2 id="related" className="section-title mb-8 md:mb-10">
            You may also like
          </h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-4">
            {related.map((f) => (
              <ProductCard key={f.key} product={f.lead} members={f.members} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section aria-labelledby="recent" className="shell mt-20 md:mt-28">
          <h2 id="recent" className="section-title mb-8 md:mb-10">
            Recently viewed
          </h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-4">
            {recent.map((f) => (
              <ProductCard key={f.key} product={f.lead} members={f.members} sizes="(min-width: 1024px) 25vw, 50vw" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
