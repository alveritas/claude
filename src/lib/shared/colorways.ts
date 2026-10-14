import type { Product } from "./types";

/**
 * Each colourway is stored as its own product, with its own photos, sizes and stock
 * ("Hush Tee Obsidian", "Hush Tee Bone"), so checkout and inventory stay exact. The storefront
 * shows them as one piece with colour options: products in the same category whose names are
 * the same apart from a final colour word are grouped.
 *
 * To add a colourway to a piece, name it "<Style> <Colour>" with one of these words.
 */
export const COLORWAY_WORDS = [
  "Obsidian", "Bone", "Fawn", "Ash", "Sand", "Slate", "Ivory", "Onyx",
  "Black", "White", "Cream", "Stone", "Charcoal", "Smoke", "Fog", "Mist", "Ink", "Midnight",
  "Navy", "Noir", "Jet", "Coal", "Graphite", "Grey", "Gray", "Silver", "Pearl", "Chalk",
  "Oat", "Ecru", "Khaki", "Taupe", "Mocha", "Espresso", "Cocoa", "Chocolate", "Brown", "Tan",
  "Camel", "Rust", "Clay", "Burgundy", "Wine", "Oxblood", "Red", "Olive", "Moss", "Sage",
  "Forest", "Green", "Blue", "Indigo", "Denim", "Dune", "Bark",
];
const WORDS = new Map(COLORWAY_WORDS.map((w) => [w.toLowerCase(), w]));

export function splitName(name: string): { family: string; colorway: string | null } {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? "";
  if (parts.length > 1 && WORDS.has(last.toLowerCase())) return { family: parts.slice(0, -1).join(" "), colorway: last };
  return { family: name.trim(), colorway: null };
}

/** Pieces with the same key are colourways of one style. A piece without a colour word is its own. */
export function familyKey(p: Pick<Product, "id" | "name" | "category">): string {
  const { family, colorway } = splitName(p.name);
  return colorway ? `${p.category}:${family.toLowerCase()}` : `id:${p.id}`;
}

/** URL-style id for the whole style, e.g. "hush-tee". */
export function familySlug(p: Pick<Product, "name" | "slug">): string {
  const { family, colorway } = splitName(p.name);
  if (!colorway) return p.slug;
  return family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Every colourway of this piece among `products`, itself included, in catalogue order. */
export function familyOf(product: Product, products: Product[]): Product[] {
  const key = familyKey(product);
  const same = products.filter((p) => familyKey(p) === key);
  if (!same.some((p) => p.id === product.id)) same.push(product);
  return same.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The colourways of this piece, or an empty list when it only comes in one. */
export function colorwaysOf(product: Product, products: Product[]): Product[] {
  const f = familyOf(product, products);
  return f.length > 1 ? f : [];
}

/** The name shown for a piece: just the style ("Hush Tee") when its colours are shown together. */
export function styleName(product: Product, members: Product[]): string {
  return members.length > 1 ? splitName(product.name).family : product.name;
}

/** What a colour option is called: the colourway word, else the colour text. */
export function colorwayLabel(p: Product): string {
  return splitName(p.name).colorway ?? p.color ?? p.name;
}

export interface Family {
  key: string;
  /** The colourway shown first: the first one in `list`, so filters and sorting decide it. */
  lead: Product;
  /** All colourways (from `all`), in catalogue order. */
  members: Product[];
}

/** One entry per piece, in the order pieces first appear in `list`. */
export function groupFamilies(list: Product[], all: Product[] = list): Family[] {
  const seen = new Set<string>();
  const out: Family[] = [];
  for (const p of list) {
    const key = familyKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, lead: p, members: familyOf(p, all) });
  }
  return out;
}

const SHADES: [RegExp, string][] = [
  [/washed\s*black|charcoal/i, "#2c2c2c"],
  [/washed\s*white|stone/i, "#e3e0d9"],
  [/black|obsidian|onyx/i, "#0d0d0d"],
  [/white|bone|ivory|cream/i, "#f1eee7"],
  [/brown|fawn|camel|tan/i, "#8b6a4a"],
  [/grey|gray|ash|slate/i, "#8a8a88"],
  [/sand|beige|oat|ecru|khaki|dune/i, "#cdbb9c"],
  [/navy|midnight|indigo/i, "#1d2433"],
  [/blue|denim/i, "#4a5f7d"],
  [/olive|moss|sage|forest|green/i, "#5b6146"],
  [/burgundy|wine|oxblood/i, "#4e1f24"],
  [/red|rust|clay/i, "#8a3b2c"],
  [/mocha|espresso|cocoa|chocolate|bark/i, "#4a3427"],
];

/** Swatch fill from the colour text, e.g. "Black / Brown fur" → a black and brown split. */
export function swatchBackground(color: string | null): string {
  // Small details ("White / Black stripes") don't change what colour the piece is; a trim that
  // covers a lot of it ("Black / Brown fur") does, so it shows as a split.
  const parts = (color ?? "")
    .split("/")
    .map((s) => s.trim())
    .filter((s, i) => s && !(i > 0 && /stripe|print|logo|script|piping|stitch|embroider/i.test(s)));
  const shades = parts.map((p) => SHADES.find(([re]) => re.test(p))?.[1]).filter((s): s is string => Boolean(s));
  if (!shades.length) return "var(--color-charcoal)";
  if (shades.length === 1 || shades[0] === shades[1]) return shades[0];
  return `linear-gradient(135deg, ${shades[0]} 0 50%, ${shades[1]} 50% 100%)`;
}
