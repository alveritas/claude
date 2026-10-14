/**
 * Every destination Stripe Checkout can ship to (shipping_address_collection.allowed_countries,
 * from Stripe's API reference). A country outside this list can't be offered at checkout.
 */
export const STRIPE_SHIPPING_COUNTRIES = [
  "AC", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO",
  "CR", "CV", "CW", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER",
  "ES", "ET", "FI", "FJ", "FK", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL",
  "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HN", "HR", "HT", "HU", "ID",
  "IE", "IL", "IM", "IN", "IO", "IQ", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI",
  "KM", "KN", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV",
  "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MK", "ML", "MM", "MN", "MO", "MQ", "MR", "MS", "MT",
  "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NG", "NI", "NL", "NO", "NP", "NR", "NU",
  "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PY", "QA",
  "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL",
  "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SZ", "TA", "TC", "TD", "TF", "TG", "TH", "TJ",
  "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VA",
  "VC", "VE", "VG", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW", "ZZ",
] as const;
export type ShippingCountry = (typeof STRIPE_SHIPPING_COUNTRIES)[number];

/** A zone whose countries are ["*"] covers everywhere no other zone lists by name. */
export const WORLDWIDE = "*";

/**
 * Left out of "everywhere else" on purpose: uninhabited or military-only territories, an
 * "unknown region" placeholder, and countries most carriers have suspended service to or that
 * are under broad sanctions. Any of them can still be added to a zone by its code.
 */
export const NOT_IN_WORLDWIDE: readonly string[] = ["AQ", "BV", "GS", "TF", "IO", "ZZ", "RU", "BY"];

export const WORLDWIDE_COUNTRIES: readonly string[] = STRIPE_SHIPPING_COUNTRIES.filter((c) => !NOT_IN_WORLDWIDE.includes(c));

const SHIPPABLE = new Set<string>(STRIPE_SHIPPING_COUNTRIES);
export const isShippableCountry = (code: string) => SHIPPABLE.has(code);

let names: Intl.DisplayNames | null = null;

export function countryName(code: string): string {
  try {
    names ??= new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** ISO 3166-1 alpha-2 check (format plus a known region name). */
export function isCountryCode(code: string): boolean {
  if (!/^[A-Z]{2}$/.test(code)) return false;
  const name = countryName(code);
  return name !== code;
}

const WORLDWIDE_WORDS = new Set(["*", "WORLD", "WORLDWIDE", "ALL", "EVERYWHERE", "INTERNATIONAL"]);

/**
 * Admin input → country codes. "*" (or "worldwide", "all", "everywhere") means every other
 * country. Codes Stripe can't ship to are reported as invalid.
 */
export function parseCountryList(input: string): { valid: string[]; invalid: string[] } {
  const parts = input
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    if (WORLDWIDE_WORDS.has(p)) valid.push(WORLDWIDE);
    else (isCountryCode(p) && isShippableCountry(p) ? valid : invalid).push(p);
  }
  return { valid: [...new Set(valid)], invalid };
}

/** "US, CA" / "Everywhere else" for display. */
export function describeCountries(codes: string[]): string {
  if (codes.includes(WORLDWIDE)) {
    const named = codes.filter((c) => c !== WORLDWIDE);
    return named.length ? `${named.map(countryName).join(", ")} and everywhere else` : "Everywhere else";
  }
  return codes.map(countryName).join(", ");
}
