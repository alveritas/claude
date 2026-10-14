/**
 * The shopper's contact and shipping details, entered on the site's own checkout page before
 * paying. The same checks run in the browser (instant messages) and on the server (the only
 * ones that count).
 */
import { isValidEmail } from "./format";

export interface CheckoutCustomer {
  email: string;
  phone: string | null;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal: string | null;
  country: string;
}
export type CustomerField = keyof CheckoutCustomer;
export type CustomerErrors = Partial<Record<CustomerField, string>>;

/** How a shopper pays. "paypal" covers debit and credit cards too (PayPal's guest checkout). */
export type PaymentMethod = "paypal" | "cashapp";

/** Regions with a fixed list, shown as a dropdown so the code is always one carriers accept. */
export const REGIONS: Record<string, { label: string; options: [string, string][] }> = {
  US: {
    label: "State",
    options: [
      ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
      ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"],
      ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
      ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
      ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"],
      ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
      ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
      ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
      ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
      ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
      ["PR", "Puerto Rico"], ["GU", "Guam"], ["VI", "U.S. Virgin Islands"], ["AS", "American Samoa"],
      ["MP", "Northern Mariana Islands"], ["AA", "Armed Forces Americas"], ["AE", "Armed Forces Europe"],
      ["AP", "Armed Forces Pacific"],
    ],
  },
  CA: {
    label: "Province",
    options: [
      ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"],
      ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"], ["NU", "Nunavut"],
      ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon"],
    ],
  },
  AU: {
    label: "State",
    options: [
      ["ACT", "Australian Capital Territory"], ["NSW", "New South Wales"], ["NT", "Northern Territory"],
      ["QLD", "Queensland"], ["SA", "South Australia"], ["TAS", "Tasmania"], ["VIC", "Victoria"], ["WA", "Western Australia"],
    ],
  },
};

/** Places that don't use postal codes, so the field is optional there. */
const NO_POSTCODE = new Set(
  "AE AG AO AW BF BI BJ BO BS BW BZ CD CF CG CI CK CM DJ DM ER FJ GA GD GH GM GQ GY HK IE KI KM KN KP LC ML MO MR MS MW NR NU QA RW SB SC SL SR ST SY TD TF TG TK TL TO TV TZ UG VU YE ZW".split(" "),
);
export const postalRequired = (country: string) => !NO_POSTCODE.has(country.toUpperCase());
export const regionRequired = (country: string) => country.toUpperCase() in REGIONS;
export const postalLabel = (country: string) => (country === "US" ? "ZIP code" : "Postal code");

const POSTAL_FORMAT: Record<string, RegExp> = {
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/,
  AU: /^\d{4}$/,
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Checks and tidies what the shopper typed. Returns every problem at once, by field. */
export function checkCustomer(input: unknown): { ok: true; value: CheckoutCustomer } | { ok: false; errors: CustomerErrors } {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const country = text(o.country, 2).toUpperCase();
  const v: CheckoutCustomer = {
    email: text(o.email, 254).toLowerCase(),
    phone: text(o.phone, 30) || null,
    name: text(o.name, 80),
    line1: text(o.line1, 120),
    line2: text(o.line2, 120) || null,
    city: text(o.city, 80),
    state: text(o.state, 60) || null,
    postal: text(o.postal, 12).toUpperCase() || null,
    country,
  };
  const e: CustomerErrors = {};
  if (!isValidEmail(v.email)) e.email = "Enter a valid email address.";
  if (v.phone) {
    const digits = v.phone.replace(/\D/g, "");
    if (!/^[+\d\s().-]+$/.test(v.phone) || digits.length < 7 || digits.length > 15) e.phone = "Enter a valid phone number, or leave it blank.";
  }
  if ((v.name.match(/\p{L}/gu) ?? []).length < 2) e.name = "Enter your full name.";
  if (v.line1.length < 3) e.line1 = "Enter your street address.";
  if (!v.city) e.city = "Enter your city.";
  if (!/^[A-Z]{2}$/.test(country)) e.country = "Choose a country.";
  const regions = REGIONS[country];
  if (regions) {
    const code = v.state?.toUpperCase() ?? "";
    const match = regions.options.find(([c, n]) => c === code || n.toUpperCase() === code);
    if (!match) e.state = `Choose a ${regions.label.toLowerCase()}.`;
    else v.state = match[0];
  }
  if (country && postalRequired(country)) {
    const fmt = POSTAL_FORMAT[country];
    if (!v.postal) e.postal = `Enter your ${postalLabel(country).toLowerCase()}.`;
    else if (fmt ? !fmt.test(v.postal) : !/^[A-Z0-9][A-Z0-9 -]{1,11}$/.test(v.postal))
      e.postal = `Check your ${postalLabel(country).toLowerCase()}.`;
  }
  return Object.keys(e).length ? { ok: false, errors: e } : { ok: true, value: v };
}

/** "Jordan Lee" → ["Jordan", "Lee"]; one word → [word, ""]. */
export function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return [parts[0] ?? "", ""];
  return [parts.slice(0, -1).join(" "), parts[parts.length - 1]];
}

