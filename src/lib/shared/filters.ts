import { productAvailability, type Availability } from "./commerce";
import { CATEGORIES, type Category, type Product, type StoreSettings } from "./types";

export const SORTS = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price, low to high",
  "price-desc": "Price, high to low",
} as const;
export type SortKey = keyof typeof SORTS;

export type AvailabilityFilter = "available" | "coming_soon" | "sold_out";
export const AVAILABILITY_FILTERS: Record<AvailabilityFilter, string> = {
  available: "Available now",
  coming_soon: "Coming soon",
  sold_out: "Sold out",
};

export const PAGE_SIZE = 12;

export interface ShopFilters {
  category: Category | "all";
  sizes: string[];
  colors: string[];
  availability: AvailabilityFilter[];
  sort: SortKey;
  q: string;
  collection: string | null;
  page: number;
}

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

export function parseFilters(params: URLSearchParams): ShopFilters {
  const cat = params.get("category");
  const sort = params.get("sort");
  const page = Number(params.get("page") ?? "1");
  return {
    category: cat && (CATEGORIES as readonly string[]).includes(cat) ? (cat as Category) : "all",
    sizes: list(params.get("size")),
    colors: list(params.get("color")),
    availability: list(params.get("availability")).filter(
      (a): a is AvailabilityFilter => a in AVAILABILITY_FILTERS,
    ),
    sort: sort && sort in SORTS ? (sort as SortKey) : "featured",
    q: (params.get("q") ?? "").slice(0, 80),
    collection: params.get("collection"),
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

export function filtersToParams(f: ShopFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.category !== "all") p.set("category", f.category);
  if (f.sizes.length) p.set("size", f.sizes.join(","));
  if (f.colors.length) p.set("color", f.colors.join(","));
  if (f.availability.length) p.set("availability", f.availability.join(","));
  if (f.sort !== "featured") p.set("sort", f.sort);
  if (f.q) p.set("q", f.q);
  if (f.collection) p.set("collection", f.collection);
  if (f.page > 1) p.set("page", String(f.page));
  return p;
}

function bucket(a: Availability): AvailabilityFilter | null {
  if (a === "available" || a === "low_stock") return "available";
  if (a === "coming_soon") return "coming_soon";
  if (a === "sold_out") return "sold_out";
  return null;
}

export function matchesQuery(p: Product, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [p.name, p.category, p.color ?? "", p.description ?? ""].join(" ").toLowerCase();
  return needle.split(/\s+/).every((word) => hay.includes(word));
}

export function applyFilters(products: Product[], f: ShopFilters, settings: StoreSettings): Product[] {
  const out = products.filter((p) => {
    if (f.category !== "all" && p.category !== f.category) return false;
    if (f.collection && p.collectionId !== f.collection) return false;
    if (f.sizes.length && !p.variants.some((v) => f.sizes.includes(v.size))) return false;
    if (f.colors.length && !(p.color && f.colors.includes(p.color))) return false;
    if (f.availability.length) {
      const b = bucket(productAvailability(p, settings));
      if (!b || !f.availability.includes(b)) return false;
    }
    return matchesQuery(p, f.q);
  });
  const byPrice = (dir: 1 | -1) => (a: Product, b: Product) => {
    // Unpriced pieces always sort last; they have no price to compare.
    if (a.priceCents == null && b.priceCents == null) return a.sortOrder - b.sortOrder;
    if (a.priceCents == null) return 1;
    if (b.priceCents == null) return -1;
    return (a.priceCents - b.priceCents) * dir;
  };
  switch (f.sort) {
    case "newest":
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "price-asc":
      return out.sort(byPrice(1));
    case "price-desc":
      return out.sort(byPrice(-1));
    default:
      return out.sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder);
  }
}

/** Filter options come from the catalog itself, so nothing is offered that doesn't exist. */
const LETTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "OS"];

export function sizeRank(size: string): number {
  const s = size.trim().toUpperCase();
  const letter = LETTER_SIZES.indexOf(s);
  if (letter >= 0) return letter;
  // Numeric sizes, including labels like "US 8–9" or "W32": order by the first number.
  const m = s.match(/\d+(\.\d+)?/);
  return m ? 100 + parseFloat(m[0]) : 1000;
}

export function filterOptions(products: Product[]) {
  const sizes = new Set<string>();
  const colors = new Set<string>();
  for (const p of products) {
    p.variants.forEach((v) => sizes.add(v.size));
    if (p.color) colors.add(p.color);
  }
  return {
    sizes: [...sizes].sort((a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b)),
    colors: [...colors].sort(),
  };
}
