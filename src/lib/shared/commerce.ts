import type { CartLine, Product, ProductVariant, StoreSettings } from "./types";

export type Availability = "coming_soon" | "available" | "low_stock" | "sold_out" | "unavailable";

/** Real stock threshold for the "low stock" label. Driven only by actual inventory. */
export const LOW_STOCK_AT = 3;
export const MAX_PER_LINE = 10;

export function totalStock(p: Product): number {
  return p.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
}

/** A product is only purchasable once it's live, priced, sized and stocked. */
export function productAvailability(p: Product, settings: StoreSettings): Availability {
  if (p.status === "draft" || p.status === "archived") return "unavailable";
  if (settings.mode === "prelaunch" || p.status === "coming_soon") return "coming_soon";
  if (p.priceCents == null || p.variants.length === 0) return "coming_soon";
  const stock = totalStock(p);
  if (stock <= 0) return "sold_out";
  if (stock <= LOW_STOCK_AT) return "low_stock";
  return "available";
}

export function availabilityLabel(a: Availability): string {
  switch (a) {
    case "coming_soon":
      return "Coming soon";
    case "available":
      return "Available";
    case "low_stock":
      return "Low stock";
    case "sold_out":
      return "Sold out";
    default:
      return "Unavailable";
  }
}

export function isBuyable(a: Availability): boolean {
  return a === "available" || a === "low_stock";
}

export function variantAvailability(
  p: Product,
  v: ProductVariant,
  settings: StoreSettings,
): Availability {
  const base = productAvailability(p, settings);
  if (!isBuyable(base)) return base;
  if (v.stock <= 0) return "sold_out";
  if (v.stock <= LOW_STOCK_AT) return "low_stock";
  return "available";
}

export interface ResolvedLine {
  line: CartLine;
  product: Product;
  variant: ProductVariant;
  /** Quantity actually allowed right now (bounded by stock). */
  quantity: number;
  unitCents: number | null;
  lineCents: number | null;
  problem: string | null;
}

/** Joins stored cart lines to current catalog data. Prices always come from the catalog, never storage. */
export function resolveCart(
  lines: CartLine[],
  products: Product[],
  settings: StoreSettings,
): { lines: ResolvedLine[]; missing: CartLine[]; subtotalCents: number; itemCount: number } {
  const resolved: ResolvedLine[] = [];
  const missing: CartLine[] = [];
  for (const line of lines) {
    const product = products.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (!product || !variant) {
      missing.push(line);
      continue;
    }
    const a = variantAvailability(product, variant, settings);
    let problem: string | null = null;
    let quantity = Math.min(line.quantity, MAX_PER_LINE);
    if (!isBuyable(a)) {
      problem = a === "sold_out" ? "Sold out" : "Not available to buy yet";
    } else if (quantity > variant.stock) {
      quantity = variant.stock;
      problem = `Only ${variant.stock} available`;
    }
    const unitCents = product.priceCents;
    resolved.push({
      line,
      product,
      variant,
      quantity,
      unitCents,
      lineCents: unitCents == null ? null : unitCents * quantity,
      problem,
    });
  }
  const purchasable = resolved.filter((r) => !r.problem || r.problem.startsWith("Only"));
  return {
    lines: resolved,
    missing,
    subtotalCents: purchasable.reduce((s, r) => s + (r.lineCents ?? 0), 0),
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
  };
}

export function launchCountdown(launchDate: string | null, now = Date.now()) {
  if (!launchDate) return null;
  const target = new Date(launchDate).getTime();
  if (!Number.isFinite(target) || target <= now) return null;
  let s = Math.floor((target - now) / 1000);
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  const seconds = s - minutes * 60;
  return { days, hours, minutes, seconds };
}
