import type { MetadataRoute } from "next";
import { getStoreData } from "@/lib/server/catalog";
import { siteUrl } from "@/lib/server/env";
import { INFO_PAGES } from "@/lib/shared/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { products, collections } = await getStoreData();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/collections`, lastModified: now, priority: 0.6 },
    { url: `${base}/about`, lastModified: now, priority: 0.6 },
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}`, lastModified: now, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: now, priority: 0.8 })),
    ...Object.keys(INFO_PAGES).map((s) => ({ url: `${base}/info/${s}`, lastModified: now, priority: 0.3 })),
  ];
}
