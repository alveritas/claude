import { isShippableCountry, WORLDWIDE, WORLDWIDE_COUNTRIES } from "./countries";
import type { ShippingZone } from "./types";

/**
 * The zone that ships to a country: a zone naming the country wins; otherwise the
 * "everywhere else" zone (countries ["*"]) if there is one. Inactive zones never match.
 */
export function zoneFor(zones: ShippingZone[], country: string | null | undefined): ShippingZone | undefined {
  if (!country || !isShippableCountry(country)) return undefined;
  const active = zones.filter((z) => z.isActive);
  const named = active.find((z) => z.countries.includes(country));
  if (named) return named;
  return WORLDWIDE_COUNTRIES.includes(country) ? active.find((z) => z.countries.includes(WORLDWIDE)) : undefined;
}

/** Every country a customer can choose at checkout. */
export function shippableCountries(zones: ShippingZone[]): string[] {
  const active = zones.filter((z) => z.isActive);
  const out = new Set<string>();
  for (const z of active) for (const c of z.countries) if (c !== WORLDWIDE && isShippableCountry(c)) out.add(c);
  if (active.some((z) => z.countries.includes(WORLDWIDE))) for (const c of WORLDWIDE_COUNTRIES) out.add(c);
  return [...out];
}

export function shippingCents(zone: ShippingZone, subtotalCents: number): number {
  return zone.freeOverCents != null && subtotalCents >= zone.freeOverCents ? 0 : zone.rateCents;
}

/** "3–7 business days", or null when no estimate is set. */
export function dayRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const a = min ?? max!;
  const b = max ?? min!;
  return a === b ? `${a} business day${a === 1 ? "" : "s"}` : `${Math.min(a, b)}–${Math.max(a, b)} business days`;
}

/**
 * One line per active zone, cheapest destination first: "United States $8 (free over $200)".
 * The rates are the ones checkout charges, so the product page never shows a different price.
 */
export function shippingSummary(zones: ShippingZone[], money: (cents: number) => string): string[] {
  return zones
    .filter((z) => z.isActive)
    .sort((a, b) => Number(a.countries.includes(WORLDWIDE)) - Number(b.countries.includes(WORLDWIDE)) || a.rateCents - b.rateCents)
    .map((z) => {
      const name = z.countries.includes(WORLDWIDE) ? (zones.filter((x) => x.isActive).length > 1 ? "Everywhere else" : "Worldwide") : z.name;
      const rate = z.rateCents === 0 ? "free" : money(z.rateCents);
      const free = z.rateCents > 0 && z.freeOverCents != null ? ` (free over ${money(z.freeOverCents)})` : "";
      return `${name} ${rate}${free}`;
    });
}
