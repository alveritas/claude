"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useParallax } from "@/lib/client/hooks";
import { Reveal } from "@/components/layout/Ambient";
import { PriceText } from "@/components/product/bits";
import { Lightbox } from "@/components/product/Lightbox";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductImage } from "@/components/product/ProductImage";
import { useStore } from "@/components/providers/StoreProvider";
import { ExpandIcon } from "@/components/ui/Icons";
import type { Family } from "@/lib/shared/colorways";
import { CATEGORIES, CATEGORY_LABELS, type Product } from "@/lib/shared/types";
import { NewsletterForm } from "./NewsletterForm";

/** Section heading row used across the homepage: compact title, optional line, "View all" link. */
function SectionHead({ id, title, sub, href, linkLabel = "View all" }: { id: string; title: string; sub?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 md:mb-10">
      <div>
        <h2 id={id} className="section-title">
          {title}
        </h2>
        {sub && <p className="muted mt-2 text-[0.8125rem]">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="text-link shrink-0 text-[0.75rem] uppercase tracking-[0.12em]">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function FeaturedCollection({ families }: { families: Family[] }) {
  const { content } = useStore();
  const n = families.length;
  const odd = n % 2 === 1;
  // Desktop fills every row: 4 across; 3 across for 3 or 6 pieces; and for 5 or 9 a large first
  // tile spanning two columns and two rows beside the rest (5 → one big + four small).
  const feature = n >= 5 && n % 4 === 1;
  const three = !feature && n % 4 !== 0 && n % 3 === 0;
  return (
    <section aria-labelledby="first-collection" className="shell py-16 md:py-24">
      <SectionHead id="first-collection" title={content.collection_heading} sub={content.collection_subheading} href="/shop" />
      {n ? (
        <div className={`grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 ${three ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
          {families.map((f, i) => {
            const big = feature && i === 0;
            return (
              // With an odd count on two columns, the first piece spans the row so no card sits alone.
              <div key={f.key} className={`${i === 0 && odd ? "max-lg:col-span-2" : ""} ${big ? "lg:col-span-2 lg:row-span-2" : ""}`}>
                <ProductCard
                  product={f.lead}
                  members={f.members}
                  priority={i < 2}
                  feature={big}
                  sizes={big ? "(min-width: 1024px) 50vw, 100vw" : `(min-width: 1024px) ${three ? "33vw" : "25vw"}, ${i === 0 && odd ? "100vw" : "50vw"}`}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">The first pieces will appear here soon.</p>
      )}
    </section>
  );
}

/** One tile per category that has pieces, pictured by its first piece. */
export function ShopByCategory() {
  const { products } = useStore();
  const tiles = CATEGORIES.map((c) => ({ c, items: products.filter((p) => p.category === c && p.images.length) })).filter(
    (t) => t.items.length,
  );
  if (tiles.length < 2) return null;
  return (
    <section aria-labelledby="by-category" className="shell pb-16 md:pb-24">
      <SectionHead id="by-category" title="Shop by category" href="/shop" linkLabel="Shop all" />
      <div className={`grid grid-cols-2 gap-3 md:gap-5 ${tiles.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {tiles.map(({ c, items }) => {
          // A different shot from the grid above: the category's last piece, second photo where there is one.
          const last = items[items.length - 1];
          const im = last.images[1] ?? last.images[0];
          return (
            <Link key={c} href={`/shop?category=${c}`} className="group block">
              <div className="frame aspect-[4/5]">
                <Image
                  src={im.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  quality={90}
                  className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-quiet)] group-hover:scale-[1.03]"
                  style={{ objectPosition: im.focal }}
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <span className="card-title">
                  {CATEGORY_LABELS[c]} <span className="tile-arrow" aria-hidden="true">→</span>
                </span>
                <span className="muted text-[0.75rem]">Shop now</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function Editorial() {
  const { content } = useStore();
  const ref = useParallax<HTMLElement>(0.12);
  const frames = content.editorial_images
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4);
  return (
    // Headline on the page, then the cut-out figures standing crisp in a row beneath it and
    // fading into the page at the hem, like the cover. Text never sits on top of the photos.
    <section ref={ref} aria-labelledby="editorial" className="relative overflow-hidden border-y border-rule">
      <Reveal className="shell relative pt-20 md:pt-28">
        <h2 id="editorial" className="statement max-w-[11ch] text-[3rem] uppercase sm:text-[4.5rem] lg:max-w-none lg:text-[7.5rem]">
          {content.editorial_heading}
        </h2>
        <div className="mt-8 flex flex-col gap-8 md:mt-10 md:flex-row md:items-end md:justify-between">
          <p className="muted max-w-[46ch] text-[1rem] leading-relaxed">{content.editorial_body}</p>
          <Link href="/about" className="btn btn-line self-start md:self-auto">
            Discover Neverhollow
          </Link>
        </div>
      </Reveal>
      {frames.length > 0 && (
        <div className="relative mt-12 aspect-[8/5] overflow-hidden md:mt-16 lg:aspect-[16/5]" aria-hidden="true">
          <div className="parallax absolute inset-0 grid grid-cols-2 lg:grid-cols-4">
            {frames.map((url, i) => (
              <div key={url + i} className={`figure-fade relative ${i > 1 ? "max-lg:hidden" : ""}`}>
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="editorial-figure object-contain object-bottom"
                />
              </div>
            ))}
          </div>
          <div className="editorial-shade pointer-events-none absolute inset-x-0 bottom-0 h-2/5" />
        </div>
      )}
    </section>
  );
}

export function Spotlight({ product }: { product: Product }) {
  const { content } = useStore();
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const images = product.images;
  if (!images.length) return null;
  const current = images[active];

  return (
    <section aria-labelledby="spotlight" className="band-tint">
      <div className="shell grid gap-10 py-20 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-16 md:py-32 lg:gap-24">
        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="frame aspect-[4/5] w-full">
            {images.map((im, i) => (
              <div
                key={im.id}
                className="absolute inset-0 transition-opacity duration-700"
                style={{ opacity: i === active ? 1 : 0 }}
                aria-hidden={i !== active}
              >
                <ProductImage image={im} sizes="(min-width: 768px) 560px, 100vw" />
              </div>
            ))}
            <button
              type="button"
              className="absolute inset-0 cursor-zoom-in"
              onClick={() => setViewer(active)}
              aria-label={`Open ${current.label} full screen`}
            />
            <span className="pointer-events-none absolute bottom-3 right-3 grid h-9 w-9 place-items-center bg-ink/70 text-bone">
              <ExpandIcon size={15} />
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <h2 id="spotlight" className="page-title">
            {product.name}
          </h2>
          <p className="muted mt-5 max-w-[44ch] text-[0.9375rem]">{content.spotlight_body}</p>

          <div role="tablist" aria-label="Views" className="mt-10 border-t border-rule">
            {images.map((im, i) => (
              <button
                key={im.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                    e.preventDefault();
                    setActive((i + 1) % images.length);
                  } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    setActive((i - 1 + images.length) % images.length);
                  }
                }}
                className={`flex w-full items-center justify-between border-b border-rule py-3.5 text-left text-[0.9375rem] transition-colors ${
                  i === active ? "text-bone" : "text-silver hover:text-bone"
                }`}
              >
                <span>{im.label}</span>
                <span
                  className="h-px bg-bone transition-all duration-500"
                  style={{ width: i === active ? 40 : 0 }}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link href={`/products/${product.slug}`} className="btn btn-solid">
              View the piece
            </Link>
            <PriceText product={product} className="muted text-[0.875rem]" />
          </div>
        </div>
      </div>
      <Lightbox images={images} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} title={product.name} />
    </section>
  );
}

/** A slow ticker of short brand lines between sections. Pauses on hover; still for reduced motion. */
export function Marquee() {
  const { content, settings } = useStore();
  const text = settings.mode === "live" ? content.marquee_live : content.marquee_prelaunch;
  const items = text
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!items.length) return null;
  const half = [...items, ...items, ...items];
  return (
    <div className="marquee">
      <p className="sr-only">{items.join(". ")}</p>
      <div className="marquee-track" aria-hidden="true">
        {[...half, ...half].map((t, i) => (
          <span key={i} className="marquee-item">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Newsletter() {
  const { content } = useStore();
  return (
    <section id="newsletter" aria-labelledby="newsletter-heading" className="scroll-mt-24 border-t border-rule">
      <div className="shell flex flex-col items-center py-20 text-center md:py-28">
        <h2 id="newsletter-heading" className="text-[2rem] font-light uppercase tracking-[0.06em] md:text-[2.75rem]">
          {content.newsletter_heading}
        </h2>
        <p className="muted mt-4 max-w-[46ch] text-[0.9375rem] leading-relaxed">{content.newsletter_body}</p>
        <div className="w-full max-w-md text-left">
          <NewsletterForm consentText={content.newsletter_consent} source="homepage" />
        </div>
      </div>
    </section>
  );
}
