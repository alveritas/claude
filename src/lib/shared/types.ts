export const CATEGORIES = ["tops", "hoodies", "bottoms", "footwear", "accessories"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  tops: "Tops",
  hoodies: "Hoodies",
  bottoms: "Bottoms",
  footwear: "Footwear",
  accessories: "Accessories",
};

export type ProductStatus = "draft" | "coming_soon" | "available" | "archived";

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  /** Short view name shown in gallery controls, e.g. "Back, on model". */
  label: string;
  /** "contain" for wide shots that shouldn't be cropped into a tall frame. */
  fit: "cover" | "contain";
  /** CSS object-position for cropped frames. */
  focal: string;
}

export interface ProductVariant {
  id: string;
  size: string;
  sku: string | null;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  color: string | null;
  description: string | null;
  fit: string | null;
  composition: string | null;
  care: string | null;
  sizeGuide: string | null;
  /** Null until a real, verified price is entered in the admin. */
  priceCents: number | null;
  status: ProductStatus;
  featured: boolean;
  sortOrder: number;
  collectionId: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  createdAt: string;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export type StoreMode = "prelaunch" | "live";

export interface StoreSettings {
  mode: StoreMode;
  /** ISO timestamp. The countdown only renders when this is set and in the future. */
  launchDate: string | null;
  announcement: string | null;
  currency: string;
  allowPromotionCodes: boolean;
  automaticTax: boolean;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  contactEmail: string | null;
  /** Business days from order to dispatch, shown on the Shipping page. Null = not stated. */
  dispatchMinDays: number | null;
  dispatchMaxDays: number | null;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  rateCents: number;
  freeOverCents: number | null;
  minDays: number | null;
  maxDays: number | null;
  isActive: boolean;
}

/** What the storefront is allowed to know about checkout readiness. */
export interface CommerceStatus {
  checkoutEnabled: boolean;
  /** Customer-facing explanation when checkout is off. */
  message: string | null;
  /** Test keys (Square sandbox / Stripe test mode): checkout works but only accepts test payments. */
  testMode?: boolean;
  /** The payment company's name, for the trust line and the policies ("PayPal"). */
  processor?: string | null;
  /** How customers can pay, e.g. "Pay by debit or credit card, or PayPal." */
  methods?: string | null;
}

export interface CartLine {
  productId: string;
  variantId: string;
  quantity: number;
}

export type ApiResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; code: string; message: string };

export type ReviewFit = "small" | "true" | "large";

/** A published review from a verified buyer. */
export interface Review {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  size: string | null;
  color: string | null;
  fit: ReviewFit | null;
  createdAt: string;
}

/** Per product: how many published reviews, their star total and the fit answers. */
export interface RatingTally {
  count: number;
  sum: number;
  fit: Record<ReviewFit, number>;
}
