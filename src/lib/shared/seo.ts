import { WORLDWIDE } from "./countries";
import { CATEGORY_LABELS, type Product, type Review, type ShippingZone, type StoreSettings } from "./types";

const abs = (siteUrl: string, url: string) => (url.startsWith("http") ? url : `${siteUrl}${url}`);

/**
 * Product JSON-LD for search results and Google's free shopping listings. Offers are only
 * included when a real price exists; shipping details come from the zones switched on, and the
 * return policy states the final-sale terms.
 */
export function productJsonLd(
  product: Product,
  siteUrl: string,
  currency: string,
  availability: string,
  extras: { zones?: ShippingZone[]; settings?: StoreSettings } = {},
) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `NEVERHOLLOW ${product.name}`,
    productID: product.slug,
    brand: { "@type": "Brand", name: "NEVERHOLLOW" },
    image: product.images.map((i) => abs(siteUrl, i.url)),
    url: `${siteUrl}/products/${product.slug}`,
    category: CATEGORY_LABELS[product.category],
  };
  if (product.description) data.description = product.description;
  if (product.color) data.color = product.color;
  if (product.composition) data.material = product.composition;
  if (product.priceCents != null) {
    const cur = currency.toUpperCase();
    const s = extras.settings;
    const shipping = (extras.zones ?? [])
      .filter((z) => z.isActive && !z.countries.includes(WORLDWIDE) && z.countries.length <= 10)
      .map((z) => ({
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: (z.rateCents / 100).toFixed(2), currency: cur },
        shippingDestination: z.countries.map((c) => ({ "@type": "DefinedRegion", addressCountry: c })),
        ...(z.minDays != null || z.maxDays != null || s?.dispatchMinDays != null || s?.dispatchMaxDays != null
          ? {
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                ...(s?.dispatchMinDays != null || s?.dispatchMaxDays != null
                  ? { handlingTime: { "@type": "QuantitativeValue", minValue: s.dispatchMinDays ?? s.dispatchMaxDays, maxValue: s.dispatchMaxDays ?? s.dispatchMinDays, unitCode: "DAY" } }
                  : {}),
                ...(z.minDays != null || z.maxDays != null
                  ? { transitTime: { "@type": "QuantitativeValue", minValue: z.minDays ?? z.maxDays, maxValue: z.maxDays ?? z.minDays, unitCode: "DAY" } }
                  : {}),
              },
            }
          : {}),
      }));
    data.offers = {
      "@type": "Offer",
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: cur,
      availability,
      itemCondition: "https://schema.org/NewCondition",
      url: `${siteUrl}/products/${product.slug}`,
      seller: { "@type": "Organization", name: "NEVERHOLLOW" },
      ...(shipping.length ? { shippingDetails: shipping } : {}),
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "US",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      },
    };
  }
  return data;
}

/**
 * A piece sold in several colours, each on its own page: Google's ProductGroup markup lists every
 * colour as a variant, so search shows them as one product with colour options.
 */
export function productGroupJsonLd(
  group: { id: string; name: string; description: string | null },
  variants: { product: Product; availability: string }[],
  siteUrl: string,
  currency: string,
  extras: { zones?: ShippingZone[]; settings?: StoreSettings } = {},
  rating: Record<string, unknown> = {},
) {
  const data: Record<string, unknown> = {
    ...rating,
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: `NEVERHOLLOW ${group.name}`,
    productGroupID: group.id,
    brand: { "@type": "Brand", name: "NEVERHOLLOW" },
    variesBy: ["https://schema.org/color"],
    hasVariant: variants.map(({ product, availability }) => {
      const v = productJsonLd(product, siteUrl, currency, availability, extras);
      delete v["@context"];
      return { ...v, inProductGroupWithID: group.id };
    }),
  };
  if (group.description) data.description = group.description;
  return data;
}

/**
 * Star rating markup from published verified-buyer reviews. Empty until real reviews exist, so
 * search results never show a rating the store didn't earn.
 */
export function reviewsJsonLd(reviews: Review[]): Record<string, unknown> {
  if (!reviews.length) return {};
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: (Math.round(avg * 10) / 10).toFixed(1),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.slice(0, 10).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      datePublished: r.createdAt.slice(0, 10),
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      ...(r.title ? { name: r.title } : {}),
      reviewBody: r.body,
    })),
  };
}

export function breadcrumbJsonLd(siteUrl: string, trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: `${siteUrl}${t.path}` })),
  };
}

export function websiteJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NEVERHOLLOW",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/shop?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Serialises JSON-LD safely for an inline <script> (admin-entered text can't close the tag). */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
