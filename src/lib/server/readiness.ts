import type { CommerceStatus, Product, ShippingZone, StoreSettings } from "@/lib/shared/types";
import { cashAppReady, cashTag } from "./cashapp";
import { hasEmail, hasServiceRole, hasSupabase } from "./env";
import { activeProvider, paymentMethodsText, paymentMode, processorName } from "./payments";

/**
 * What the public storefront is told about checkout. No configuration details leak out.
 * paymentsReady: from paymentsReady() — the payment company is connected and working.
 */
export function getCommerceStatus(settings: StoreSettings, zones: ShippingZone[], paymentsReady: boolean): CommerceStatus {
  const processor = processorName();
  // Square already takes Cash App Pay itself; the $Cashtag option is for the other checkouts.
  const tag = activeProvider() !== "square" && cashAppReady(settings.currency) ? cashTag() : null;
  const methods = paymentMethodsText(Boolean(tag));
  if (settings.mode === "prelaunch") {
    return { checkoutEnabled: false, message: "Checkout opens when Drop 001 is released.", processor, methods };
  }
  // Square and PayPal keep every order themselves (and email the seller), so they can sell even
  // before the database is connected; Stripe orders are only kept here, so Stripe needs it.
  const needsDatabase = activeProvider() === "stripe";
  if (!activeProvider() || !paymentsReady || (needsDatabase && (!hasSupabase() || !hasServiceRole()))) {
    return { checkoutEnabled: false, message: "Checkout isn’t available yet. Your bag is saved on this device.", processor, methods };
  }
  if (!zones.some((z) => z.isActive)) {
    return { checkoutEnabled: false, message: "Shipping destinations haven’t been opened yet, so checkout is closed.", processor, methods };
  }
  return { checkoutEnabled: true, message: null, testMode: paymentMode() === "test", processor, methods, ...(tag ? { cashTag: tag } : {}) };
}

export interface ReadinessItem {
  label: string;
  ok: boolean;
  detail: string;
  /** Optional = the store can launch without it. */
  optional?: boolean;
}

/** Admin-only launch checklist. */
export function getReadiness(args: {
  settings: StoreSettings;
  products: Product[];
  zones: ShippingZone[];
  webhookReady: boolean;
}): ReadinessItem[] {
  const { settings, products, zones, webhookReady } = args;
  const mode = paymentMode();
  const provider = activeProvider();
  const active = zones.filter((z) => z.isActive);
  const sellable = products.filter(
    (p) => p.status === "available" && p.priceCents != null && p.variants.some((v) => v.stock > 0),
  );
  const stocked = products.filter(
    (p) => (p.status === "available" || p.status === "coming_soon") && p.priceCents != null && p.variants.some((v) => v.stock > 0),
  );
  const listed = products.filter((p) => p.status === "available" || p.status === "coming_soon");
  const noComposition = listed.filter((p) => !p.composition?.trim());
  const noSizeGuide = listed.filter((p) => !p.sizeGuide?.trim());
  return [
    {
      label: "Database and accounts (Supabase)",
      ok: hasSupabase() && hasServiceRole(),
      detail: hasSupabase()
        ? hasServiceRole()
          ? "Connected."
          : "The Supabase secret (service role) key is missing — newsletter signups, uploads and orders need it."
        : "Connect Supabase to the site (Vercel: Storage tab; Netlify: Extensions → Supabase) and redeploy.",
    },
    {
      label: `Payments (${processorName() ?? "PayPal"})`,
      ok: Boolean(provider) && mode === "live" && webhookReady,
      detail: !provider
        ? "Add the PayPal email that receives payments (src/data/launch.ts or PAYPAL_EMAIL) and redeploy."
        : !webhookReady
          ? provider === "square"
            ? "Square didn’t accept the access token. Check SQUARE_ACCESS_TOKEN under Payments."
            : "Not connected. Open Payments and press “Connect order webhook”."
          : mode === "live"
            ? `Connected — ${(paymentMethodsText() ?? "").replace(/^Pay by /, "").replace(/\.$/, "")}.`
            : "Test mode — only test payments work.",
    },
    {
      label: "Cash App ($Cashtag)",
      ok: Boolean(cashTag()) && hasServiceRole() && settings.currency.toLowerCase() === "usd",
      optional: true,
      detail: !cashTag()
        ? "Off. Add your $Cashtag as CASHAPP_TAG in Netlify (Site configuration → Environment variables) and redeploy. US shoppers can then choose Cash App at checkout."
        : !hasServiceRole()
          ? `${cashTag()} is set, but Cash App orders are kept in the database, so it switches on once Supabase is connected.`
          : settings.currency.toLowerCase() !== "usd"
            ? "Cash App only takes US dollars; set the store currency to USD to offer it."
            : `On. US shoppers can send their payment to ${cashTag()}. Their orders wait under Orders as “Awaiting payment”: mark each one Paid once the money shows in Cash App.`,
    },
    {
      label: "Shipping destinations",
      ok: active.length > 0,
      detail: active.length
        ? `${active.length} zone${active.length > 1 ? "s" : ""} switched on.`
        : zones.length
          ? "Zones are set up but switched off. Review the rates under Shipping and switch them on."
          : "No destinations. Add a zone under Shipping.",
    },
    {
      label: "Stock",
      ok: stocked.length > 0,
      detail: stocked.length
        ? `${stocked.length} of ${listed.length} pieces have a price and stock.`
        : "No stock entered yet. Open each product and enter how many you have in each size.",
    },
    {
      label: "Fabric and origin on product pages",
      ok: noComposition.length === 0,
      detail: noComposition.length
        ? `Missing on ${noComposition.length} piece${noComposition.length > 1 ? "s" : ""}. Clothing sold online in the US, UK and EU must list fibre content and country of origin (e.g. “100% cotton. Made in Portugal.”) — add it under Fabric composition and origin on each product.`
        : "Listed on every piece.",
    },
    {
      label: "Size guides on product pages",
      ok: noSizeGuide.length === 0,
      detail: noSizeGuide.length
        ? `Missing on ${noSizeGuide.length} piece${noSizeGuide.length > 1 ? "s" : ""}. With all sales final, measurements are what buyers check before paying. Paste your manufacturer’s measurement table into Size guide on each product.`
        : "On every piece.",
    },
    {
      label: "Contact email",
      ok: Boolean(settings.contactEmail),
      detail: settings.contactEmail
        ? settings.contactEmail
        : "Add one under Launch. The policies, order emails and Stripe receipts point customers to it.",
    },
    {
      label: "Store mode",
      ok: settings.mode === "live",
      detail:
        settings.mode === "live"
          ? `Live — purchases are open${sellable.length ? "" : ", but nothing is set to Available"}.`
          : "Prelaunch — purchases are off. Use Release under Launch when everything above is ready.",
    },
    {
      label: "Order and shipping emails (Resend)",
      ok: hasEmail(),
      optional: true,
      detail: hasEmail()
        ? "Configured."
        : "Optional, but it sends the shipping emails that carry each buyer’s review link. Without it, turn on Stripe’s own receipt emails (Stripe → Settings → Customer emails) and send review links from Orders yourself.",
    },
  ];
}

/** What must be true before Release can switch the store to live. */
export function releaseBlockers(args: {
  settings: StoreSettings;
  products: Product[];
  zones: ShippingZone[];
  webhookReady: boolean;
}): string[] {
  const { settings, products, zones, webhookReady } = args;
  const out: string[] = [];
  if (!hasSupabase() || !hasServiceRole()) out.push("Supabase isn’t fully connected (service role key missing).");
  if (!activeProvider()) out.push("Payments aren’t connected. Add the PayPal email that receives payments.");
  else if (!webhookReady) {
    out.push(
      activeProvider() === "stripe"
        ? "The order webhook isn’t connected. Connect it under Payments."
        : "Square didn’t accept the access token. Check it under Payments.",
    );
  }
  if (!zones.some((z) => z.isActive)) out.push("No shipping zone is switched on.");
  if (!settings.contactEmail) out.push("Add a contact email.");
  const stocked = products.some(
    (p) => (p.status === "available" || p.status === "coming_soon") && p.priceCents != null && p.variants.some((v) => v.stock > 0),
  );
  if (!stocked) out.push("No piece has a price and stock yet.");
  return out;
}
