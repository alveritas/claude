import type { Product, ShippingZone, StoreSettings } from "@/lib/shared/types";
import { SUGGESTED_SHIPPING_ZONES } from "./seed";

/**
 * Drop 001 launch, as given by the owner: 150 in every size of every piece, and the contact
 * address. Applied once, automatically, the first time the site runs with live payments
 * connected; after that, everything is changed in the admin and this is never re-applied.
 */
export const LAUNCH = {
  marker: "launch_drop_001",
  stockPerSize: 150,
  contactEmail: "neverhollowonline@gmail.com",
  announcement: "Drop 001 is out now | Worldwide shipping",
} as const;

/** Announcement texts from before release, replaced by the launch announcement. */
export const isPrelaunchAnnouncement = (a: string | null | undefined) => !a || /almost here|coming soon|arrives in/i.test(a);

/** The built-in catalogue (no database) with the launch applied: live, stocked, shipping on. */
export function launchedSeed(products: Product[], settings: StoreSettings): { products: Product[]; settings: StoreSettings; zones: ShippingZone[] } {
  return {
    products: products.map((p) => ({
      ...p,
      status: p.status === "coming_soon" && p.priceCents != null ? "available" : p.status,
      variants: p.variants.map((v) => (v.stock === 0 ? { ...v, stock: LAUNCH.stockPerSize } : v)),
    })),
    settings: {
      ...settings,
      mode: "live",
      contactEmail: settings.contactEmail ?? LAUNCH.contactEmail,
      announcement: isPrelaunchAnnouncement(settings.announcement) ? LAUNCH.announcement : settings.announcement,
    },
    zones: SUGGESTED_SHIPPING_ZONES.map((z) => ({ ...z, isActive: true })),
  };
}
