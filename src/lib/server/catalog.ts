import { cache } from "react";
import { DEFAULT_SETTINGS, SEED_COLLECTIONS, SEED_PRODUCTS, SEED_SHIPPING_ZONES } from "@/data/seed";
import { mergeContent, type SiteContent } from "@/lib/shared/content";
import type { Collection, Product, ShippingZone, StoreSettings } from "@/lib/shared/types";
import { launchedSeed } from "@/data/launch";
import { readyToLaunch } from "./launch";
import { getPublicSupabase } from "./supabase";

export const PRODUCT_SELECT =
  "id, slug, name, category, color, description, fit, composition, care, size_guide, price_cents, status, featured, sort_order, collection_id, created_at, product_images(id, url, alt, label, fit, focal, sort_order), product_variants(id, size, sku, stock, sort_order)";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapProduct(row: any): Product {
  const bySort = (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    color: row.color ?? null,
    description: row.description ?? null,
    fit: row.fit ?? null,
    composition: row.composition ?? null,
    care: row.care ?? null,
    sizeGuide: row.size_guide ?? null,
    priceCents: row.price_cents ?? null,
    status: row.status,
    featured: Boolean(row.featured),
    sortOrder: row.sort_order ?? 0,
    collectionId: row.collection_id ?? null,
    createdAt: row.created_at,
    images: [...(row.product_images ?? [])].sort(bySort).map((i: any) => ({
      id: i.id,
      url: i.url,
      alt: i.alt ?? "",
      label: i.label ?? "",
      fit: i.fit === "contain" ? "contain" : "cover",
      focal: i.focal ?? "50% 35%",
    })),
    variants: [...(row.product_variants ?? [])].sort(bySort).map((v: any) => ({
      id: v.id,
      size: v.size,
      sku: v.sku ?? null,
      stock: v.stock ?? 0,
    })),
  };
}

export function mapSettings(row: any): StoreSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    mode: row.mode === "live" ? "live" : "prelaunch",
    launchDate: row.launch_date ?? null,
    announcement: row.announcement ?? null,
    currency: row.currency ?? "usd",
    allowPromotionCodes: Boolean(row.allow_promotion_codes),
    automaticTax: Boolean(row.automatic_tax),
    instagramUrl: row.instagram_url ?? null,
    tiktokUrl: row.tiktok_url ?? null,
    contactEmail: row.contact_email ?? null,
    dispatchMinDays: row.dispatch_min_days ?? null,
    dispatchMaxDays: row.dispatch_max_days ?? null,
  };
}

export function mapZone(row: any): ShippingZone {
  return {
    id: row.id,
    name: row.name,
    countries: row.countries ?? [],
    rateCents: row.rate_cents ?? 0,
    freeOverCents: row.free_over_cents ?? null,
    minDays: row.min_days ?? null,
    maxDays: row.max_days ?? null,
    isActive: Boolean(row.is_active),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface StoreData {
  products: Product[];
  collections: Collection[];
  settings: StoreSettings;
  content: SiteContent;
  zones: ShippingZone[];
  /** "seed" means Supabase isn't configured and the built-in Drop 001 catalogue is shown. */
  source: "supabase" | "seed";
}

/**
 * Everything the storefront renders from. One round of parallel queries per request,
 * deduplicated with React cache(). Errors are thrown (and shown by error.tsx) rather than
 * silently replaced with seed data, so the live store never shows stand-in data.
 */
export const getStoreData = cache(async (): Promise<StoreData> => {
  const sb = getPublicSupabase();
  if (!sb) {
    // No database: the built-in catalogue. Once live payments are connected it opens for sale
    // (Square keeps the orders), otherwise it stays Coming soon.
    const launched = readyToLaunch() ? launchedSeed(SEED_PRODUCTS, DEFAULT_SETTINGS) : null;
    return {
      products: launched?.products ?? SEED_PRODUCTS,
      collections: SEED_COLLECTIONS,
      settings: launched?.settings ?? DEFAULT_SETTINGS,
      content: mergeContent([]),
      zones: launched?.zones ?? SEED_SHIPPING_ZONES,
      source: "seed",
    };
  }
  const [products, collections, settings, content, zones] = await Promise.all([
    sb
      .from("products")
      .select(PRODUCT_SELECT)
      .in("status", ["coming_soon", "available"])
      .order("sort_order"),
    sb.from("collections").select("id, slug, name, description, sort_order").eq("is_published", true).order("sort_order"),
    sb.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("site_content").select("key, value"),
    sb.from("shipping_zones").select("*").eq("is_active", true).order("sort_order"),
  ]);
  const err = products.error ?? collections.error ?? settings.error ?? content.error ?? zones.error;
  if (err) throw new Error(`Store data failed to load: ${err.message}`);
  return {
    products: (products.data ?? []).map(mapProduct),
    collections: (collections.data ?? []).map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description ?? null,
      sortOrder: c.sort_order ?? 0,
    })),
    settings: mapSettings(settings.data),
    content: mergeContent(content.data),
    zones: (zones.data ?? []).map(mapZone),
    source: "supabase",
  };
});

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { products } = await getStoreData();
  return products.find((p) => p.slug === slug) ?? null;
}
