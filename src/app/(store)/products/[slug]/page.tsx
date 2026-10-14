import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/views/ProductView";
import { getProductBySlug, getStoreData } from "@/lib/server/catalog";
import { siteUrl } from "@/lib/server/env";
import { getReviewsFor } from "@/lib/server/reviews";
import { familyOf, familySlug, styleName } from "@/lib/shared/colorways";
import { isBuyable, productAvailability } from "@/lib/shared/commerce";
import { breadcrumbJsonLd, jsonLdString, productGroupJsonLd, productJsonLd, reviewsJsonLd } from "@/lib/shared/seo";
import { CATEGORY_LABELS, type Product, type StoreSettings } from "@/lib/shared/types";

type Props = { params: Promise<{ slug: string }> };

function schemaAvailability(product: Product, settings: StoreSettings) {
  const a = productAvailability(product, settings);
  return isBuyable(a) ? "https://schema.org/InStock" : a === "sold_out" ? "https://schema.org/OutOfStock" : "https://schema.org/PreOrder";
}

export async function generateStaticParams() {
  const { products } = await getStoreData();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found" };
  const title = `NEVERHOLLOW ${product.name}`;
  const image = product.images[0];
  const description = product.description ?? `${product.name} by NEVERHOLLOW.`;
  const images = image ? [{ url: image.url, alt: image.alt }] : undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title, description, url: `/products/${product.slug}`, images },
    twitter: { card: "summary_large_image", title, description, images: image ? [image.url] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, { settings, zones, products }] = await Promise.all([getProductBySlug(slug), getStoreData()]);
  if (!product) notFound();
  const base = siteUrl();
  const extras = { zones, settings };
  const members = familyOf(product, products);
  const reviews = await getReviewsFor(members.map((m) => m.id));
  const ratingLd = reviewsJsonLd(reviews);
  const jsonLd = [
    members.length > 1
      ? productGroupJsonLd(
          { id: familySlug(product), name: styleName(product, members), description: null },
          members.map((m) => ({ product: m, availability: schemaAvailability(m, settings) })),
          base,
          settings.currency,
          extras,
          ratingLd,
        )
      : { ...productJsonLd(product, base, settings.currency, schemaAvailability(product, settings), extras), ...ratingLd },
    breadcrumbJsonLd(base, [
      { name: "Shop", path: "/shop" },
      { name: CATEGORY_LABELS[product.category], path: `/shop?category=${product.category}` },
      { name: styleName(product, members), path: `/products/${product.slug}` },
    ]),
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <ProductView key={product.id} product={product} reviews={reviews} />
    </>
  );
}
