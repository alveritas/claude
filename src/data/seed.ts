/**
 * The Drop 001 catalogue as supplied in the brand mockups.
 *
 * This is the fallback used when Supabase isn't connected yet, and it mirrors
 * supabase/seed.sql exactly. Prices, sizes, stock, fabric composition, fit and care are
 * intentionally empty: they are not confirmed and must be entered in the admin.
 */
import type { Collection, Product, ProductImage, ShippingZone, StoreSettings } from "@/lib/shared/types";

const img = (
  id: string,
  file: string,
  label: string,
  alt: string,
  fit: ProductImage["fit"] = "cover",
  focal = "50% 35%",
): ProductImage => ({ id, url: `/images/products/${file}.jpg`, label, alt, fit, focal });

export const SEED_COLLECTIONS: Collection[] = [
  {
    id: "c0000000-0000-4000-8000-000000000001",
    slug: "drop-001",
    name: "Drop 001",
    description: "The first collection.",
    sortOrder: 0,
  },
];

const DROP = SEED_COLLECTIONS[0].id;
const CREATED = "2026-10-01T00:00:00.000Z";

const base = {
  fit: null,
  composition: null,
  care: null,
  sizeGuide: null,
  priceCents: null,
  status: "coming_soon" as const,
  collectionId: DROP,
  variants: [],
  createdAt: CREATED,
};

export const SEED_PRODUCTS: Product[] = [
  {
    ...base,
    id: "a0000000-0000-4000-8000-000000000001",
    slug: "vow-waffle-long-sleeve",
    name: "Vow Waffle Long Sleeve",
    category: "tops",
    color: "Black",
    description:
      "Our signature long sleeve. Black waffle knit cut oversized, with the Neverhollow script written down both sleeves and an NH monogram label at the neck.",
    featured: true,
    sortOrder: 1,
    priceCents: 9500,
    fit: "Oversized fit with dropped shoulders and ribbed cuffs.",
    variants: [
      { id: "c0000000-0000-4000-8001-000000000001", size: "XS", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8001-000000000002", size: "S", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8001-000000000003", size: "M", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8001-000000000004", size: "L", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8001-000000000005", size: "XL", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8001-000000000006", size: "XXL", sku: null, stock: 0 },
    ],
    images: [
      img("b1000000-0000-4000-8000-000000000013", "waffle-studio-front-flat", "Front, flat",
        "Vow Waffle Long Sleeve laid flat, front, with the NH label at the neck", "cover", "50% 50%"),
      img("b1000000-0000-4000-8000-000000000011", "waffle-studio-front-model", "Front, on model",
        "Vow Waffle Long Sleeve in black, worn, front view, with the Neverhollow script down both sleeves", "cover", "50% 28%"),
      img("b1000000-0000-4000-8000-000000000012", "waffle-studio-back-model", "Back, on model",
        "Vow Waffle Long Sleeve in black, worn, back view", "cover", "50% 28%"),
      img("b1000000-0000-4000-8000-000000000014", "waffle-studio-back-flat", "Back, flat",
        "Vow Waffle Long Sleeve laid flat, back", "cover", "50% 50%"),
      img("b1000000-0000-4000-8000-000000000015", "waffle-studio-nh-label", "NH label",
        "Close-up of the NH monogram label inside the ribbed collar, on black waffle knit", "cover", "50% 40%"),
    ],
  },
  {
    ...base,
    id: "a0000000-0000-4000-8000-000000000009",
    slug: "hush-tee-obsidian",
    name: "Hush Tee Obsidian",
    category: "tops",
    color: "Washed Black",
    description:
      "The quiet everyday tee. Oversized and boxy in washed black, with the Neverhollow script in white on the chest and an NH label at the neck.",
    featured: true,
    sortOrder: 2,
    priceCents: 7000,
    fit: "Oversized, boxy fit with dropped shoulders.",
    variants: [
      { id: "c0000000-0000-4000-8009-000000000001", size: "XS", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8009-000000000002", size: "S", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8009-000000000003", size: "M", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8009-000000000004", size: "L", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8009-000000000005", size: "XL", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8009-000000000006", size: "XXL", sku: null, stock: 0 },
    ],
    images: [
      img("b9000000-0000-4000-8000-000000000003", "tee-black-flat", "Flat",
        "Hush Tee Obsidian laid flat, front, with the NH label at the neck", "cover", "50% 50%"),
      img("b9000000-0000-4000-8000-000000000001", "tee-black-front-model", "Front, on model",
        "Hush Tee Obsidian, worn, front view, with the Neverhollow script on the chest", "cover", "50% 30%"),
      img("b9000000-0000-4000-8000-000000000002", "tee-black-back-model", "Back, on model",
        "Hush Tee Obsidian, worn, back view", "cover", "50% 30%"),
    ],
  },
  {
    ...base,
    id: "a0000000-0000-4000-8000-000000000010",
    slug: "hush-tee-bone",
    name: "Hush Tee Bone",
    category: "tops",
    color: "Washed White",
    description:
      "The quiet everyday tee. Oversized and boxy in washed white, with the Neverhollow script in black on the chest and an NH label at the neck.",
    featured: true,
    sortOrder: 3,
    priceCents: 7000,
    fit: "Oversized, boxy fit with dropped shoulders.",
    variants: [
      { id: "c0000000-0000-4000-8010-000000000001", size: "XS", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8010-000000000002", size: "S", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8010-000000000003", size: "M", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8010-000000000004", size: "L", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8010-000000000005", size: "XL", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8010-000000000006", size: "XXL", sku: null, stock: 0 },
    ],
    images: [
      img("ba000000-0000-4000-8000-000000000003", "tee-white-flat", "Flat",
        "Hush Tee Bone laid flat, front, with the NH label at the neck", "cover", "50% 50%"),
      img("ba000000-0000-4000-8000-000000000001", "tee-white-front-model", "Front, on model",
        "Hush Tee Bone, worn, front view, with the Neverhollow script on the chest", "cover", "50% 30%"),
      img("ba000000-0000-4000-8000-000000000002", "tee-white-back-model", "Back, on model",
        "Hush Tee Bone, worn, back view", "cover", "50% 30%"),
    ],
  },
  {
    ...base,
    id: "a0000000-0000-4000-8000-000000000002",
    slug: "vigil-fur-zip-hoodie-obsidian",
    name: "Vigil Fur Zip Hoodie Obsidian",
    category: "hoodies",
    color: "Black / Black fur",
    description:
      "Made for late nights. A black zip hoodie with a black fur-trimmed hood, the Neverhollow script across the chest, distressed details on the body and sleeves, and an NH label inside the hood.",
    featured: true,
    sortOrder: 4,
    priceCents: 18500,
    fit: "Boxy, cropped fit with a ribbed hem and cuffs.",
    variants: [
      { id: "c0000000-0000-4000-8002-000000000001", size: "XS", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8002-000000000002", size: "S", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8002-000000000003", size: "M", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8002-000000000004", size: "L", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8002-000000000005", size: "XL", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8002-000000000006", size: "XXL", sku: null, stock: 0 },
    ],
    images: [
      img("b2000000-0000-4000-8000-000000000023", "hoodie-black-flat", "Front, flat",
        "Vigil Fur Zip Hoodie Obsidian laid flat, front, with the NH label inside the hood", "cover", "50% 50%"),
      img("b2000000-0000-4000-8000-000000000021", "hoodie-black-front-model", "Front, on model",
        "Vigil Fur Zip Hoodie Obsidian, worn zipped with the black fur hood up, front view", "cover", "50% 30%"),
      img("b2000000-0000-4000-8000-000000000022", "hoodie-black-angle-model", "Angled, on model",
        "Vigil Fur Zip Hoodie Obsidian, worn zipped with the hood up, seen from above at an angle", "cover", "50% 30%"),
    ],
  },
  {
    ...base,
    id: "a0000000-0000-4000-8000-000000000005",
    slug: "vigil-fur-zip-hoodie-fawn",
    name: "Vigil Fur Zip Hoodie Fawn",
    category: "hoodies",
    color: "Black / Brown fur",
    description:
      "Made for late nights. A black zip hoodie with a brown fur-trimmed hood, the Neverhollow script across the chest, distressed details on the body and sleeves, and an NH label inside the hood.",
    featured: true,
    sortOrder: 5,
    priceCents: 18500,
    fit: "Boxy, cropped fit with a ribbed hem and cuffs.",
    variants: [
      { id: "c0000000-0000-4000-8005-000000000001", size: "XS", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8005-000000000002", size: "S", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8005-000000000003", size: "M", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8005-000000000004", size: "L", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8005-000000000005", size: "XL", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8005-000000000006", size: "XXL", sku: null, stock: 0 },
    ],
    images: [
      img("b5000000-0000-4000-8000-000000000003", "hoodie-brown-flat", "Front, flat",
        "Vigil Fur Zip Hoodie Fawn laid flat, front, with the NH label inside the hood", "cover", "50% 50%"),
      img("b5000000-0000-4000-8000-000000000001", "hoodie-brown-front-model", "Front, on model",
        "Vigil Fur Zip Hoodie Fawn, worn zipped with the brown fur hood up, front view", "cover", "50% 30%"),
      img("b5000000-0000-4000-8000-000000000002", "hoodie-brown-open-model", "Open, on model",
        "Vigil Fur Zip Hoodie Fawn, worn unzipped over a black top, seen from above at an angle", "cover", "50% 30%"),
    ],
  },
  {
    ...base,
    id: "a0000000-0000-4000-8000-000000000004",
    slug: "drift-track-pants-bone",
    name: "Drift Track Pants Bone",
    category: "bottoms",
    color: "White / Black stripes",
    description:
      "Wide, easy and made to move. White track pants with black side stripes, an elastic waist, a back patch pocket and the Neverhollow script on the front.",
    featured: true,
    sortOrder: 6,
    priceCents: 12000,
    fit: "Wide-leg fit with an elastic waist.",
    variants: [
      { id: "c0000000-0000-4000-8004-000000000001", size: "XS", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8004-000000000002", size: "S", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8004-000000000003", size: "M", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8004-000000000004", size: "L", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8004-000000000005", size: "XL", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8004-000000000006", size: "XXL", sku: null, stock: 0 },
    ],
    images: [
      img("b4000000-0000-4000-8000-000000000013", "pants-white-flat", "Flat",
        "Drift Track Pants Bone laid flat, front", "cover", "50% 50%"),
      img("b4000000-0000-4000-8000-000000000011", "pants-white-front-model", "Front, on model",
        "Drift Track Pants Bone, worn, front view, with black side stripes and the Neverhollow script on the front", "cover", "50% 55%"),
      img("b4000000-0000-4000-8000-000000000012", "pants-white-back-model", "Back, on model",
        "Drift Track Pants Bone, worn, back view, with the back patch pocket", "cover", "50% 55%"),
    ],
  },
  {
    ...base,
    id: "a0000000-0000-4000-8000-000000000006",
    slug: "drift-track-pants-obsidian",
    name: "Drift Track Pants Obsidian",
    category: "bottoms",
    color: "Black / White stripes",
    description:
      "Wide, easy and made to move. Black track pants with white side stripes, an elastic waist, a back patch pocket and the Neverhollow script on the front.",
    featured: true,
    sortOrder: 7,
    priceCents: 12000,
    fit: "Wide-leg fit with an elastic waist.",
    variants: [
      { id: "c0000000-0000-4000-8006-000000000001", size: "XS", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8006-000000000002", size: "S", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8006-000000000003", size: "M", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8006-000000000004", size: "L", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8006-000000000005", size: "XL", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8006-000000000006", size: "XXL", sku: null, stock: 0 },
    ],
    images: [
      img("b6000000-0000-4000-8000-000000000003", "pants-black-flat", "Flat",
        "Drift Track Pants Obsidian laid flat, front", "cover", "50% 50%"),
      img("b6000000-0000-4000-8000-000000000001", "pants-black-front-model", "Front, on model",
        "Drift Track Pants Obsidian, worn, front view, with white side stripes and the Neverhollow script on the front", "cover", "50% 55%"),
      img("b6000000-0000-4000-8000-000000000002", "pants-black-back-model", "Back, on model",
        "Drift Track Pants Obsidian, worn, back view, with the back patch pocket", "cover", "50% 55%"),
    ],
  },
  {
    ...base,
    id: "a0000000-0000-4000-8000-000000000007",
    slug: "haven-slides-bone",
    name: "Haven Slides Bone",
    category: "footwear",
    color: "White",
    description:
      "For the hours at home. Open-toe slides in white with a curly textured pile upper and footbed, and the Neverhollow script in black across the strap.",
    featured: true,
    sortOrder: 8,
    priceCents: 7500,
    fit: "Sold in paired sizes: each size covers two whole US sizes.",
    variants: [
      { id: "c0000000-0000-4000-8007-000000000001", size: "US 6–7", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8007-000000000002", size: "US 8–9", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8007-000000000003", size: "US 10–11", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8007-000000000004", size: "US 12–13", sku: null, stock: 0 },
    ],
    images: [
      img("b7000000-0000-4000-8000-000000000001", "slides-white-top", "Pair, from above",
        "A pair of Haven Slides Bone seen from above, with the Neverhollow script on each strap", "cover", "50% 50%"),
      img("b7000000-0000-4000-8000-000000000002", "slides-white-side", "Side",
        "A Haven Slide in bone from the side, showing the textured pile and the script on the strap", "cover", "50% 50%"),
    ],
  },
  {
    ...base,
    id: "a0000000-0000-4000-8000-000000000008",
    slug: "haven-slides-obsidian",
    name: "Haven Slides Obsidian",
    category: "footwear",
    color: "Black",
    description:
      "For the hours at home. Open-toe slides in black with a curly textured pile upper and footbed, and the Neverhollow script in white across the strap.",
    featured: true,
    sortOrder: 9,
    priceCents: 7500,
    fit: "Sold in paired sizes: each size covers two whole US sizes.",
    variants: [
      { id: "c0000000-0000-4000-8008-000000000001", size: "US 6–7", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8008-000000000002", size: "US 8–9", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8008-000000000003", size: "US 10–11", sku: null, stock: 0 },
      { id: "c0000000-0000-4000-8008-000000000004", size: "US 12–13", sku: null, stock: 0 },
    ],
    images: [
      img("b8000000-0000-4000-8000-000000000001", "slides-black-top", "Pair, from above",
        "A pair of Haven Slides Obsidian seen from above, with the Neverhollow script on each strap", "cover", "50% 50%"),
      img("b8000000-0000-4000-8000-000000000002", "slides-black-side", "Side",
        "A Haven Slide in obsidian from the side, showing the textured pile and the script on the strap", "cover", "50% 50%"),
    ],
  },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  mode: "prelaunch",
  launchDate: null,
  announcement: "Drop 001 is almost here | Join the list for early access",
  currency: "usd",
  allowPromotionCodes: false,
  automaticTax: false,
  instagramUrl: null,
  tiktokUrl: null,
  contactEmail: "neverhollowonline@gmail.com",
  dispatchMinDays: null,
  dispatchMaxDays: null,
};

/**
 * Suggested starting zones: the United States, and everywhere else Stripe ships. Both start
 * switched off, so checkout stays closed until the rates are reviewed and turned on in
 * Admin → Shipping. The rates are starting suggestions, not carrier quotes.
 */
export const SUGGESTED_SHIPPING_ZONES: ShippingZone[] = [
  {
    id: "d0000000-0000-4000-8000-000000000001",
    name: "United States",
    countries: ["US"],
    rateCents: 800,
    freeOverCents: 20000,
    minDays: 3,
    maxDays: 7,
    isActive: false,
  },
  {
    id: "d0000000-0000-4000-8000-000000000002",
    name: "Worldwide",
    countries: ["*"],
    rateCents: 3500,
    freeOverCents: null,
    minDays: 7,
    maxDays: 21,
    isActive: false,
  },
];

/** The built-in catalogue (no database) never opens checkout, so no zones are active here. */
export const SEED_SHIPPING_ZONES: ShippingZone[] = [];
