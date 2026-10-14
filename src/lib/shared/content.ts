/**
 * Every editable block of copy on the site, editable under Admin → Content. The policy pages
 * are written from how this store actually works (hosted checkout, worldwide shipping, all sales
 * final); {contact_email} is replaced with the contact email from Launch and {payment_processor}
 * with the payment company in use (Square).
 */
export interface ContentField {
  key: string;
  label: string;
  group: "Homepage" | "About" | "Pages" | "Checkout" | "Business";
  multiline?: boolean;
  defaultValue: string;
}

export const CONTENT_FIELDS = [
  { key: "hero_tagline", label: "Hero line", group: "Homepage", defaultValue: "An identity without explanation." },
  { key: "hero_status", label: "Hero release line (prelaunch)", group: "Homepage", defaultValue: "DROP 001 — COMING SOON" },
  { key: "hero_status_live", label: "Hero release line (once released)", group: "Homepage", defaultValue: "DROP 001 — OUT NOW" },
  {
    key: "hero_image",
    label: "Cover photo (image path; a transparent PNG or WebP cut-out stands on the page colour)",
    group: "Homepage",
    defaultValue: "/images/hero/cover.webp",
  },
  {
    key: "hero_image_alt",
    label: "Cover photo description (for screen readers)",
    group: "Homepage",
    defaultValue:
      "Two models in black Neverhollow zip hoodies, one with a brown fur hood and one with a black fur hood, with wide black sweatpants",
  },
  {
    key: "marquee_prelaunch",
    label: "Ticker under the cover, prelaunch (separate lines with |)",
    group: "Homepage",
    defaultValue: "Drop 001 — coming soon | Join the list for early access | Ships worldwide | Not made to explain",
  },
  {
    key: "marquee_live",
    label: "Ticker under the cover, once released (separate lines with |)",
    group: "Homepage",
    defaultValue: "Drop 001 — out now | Ships worldwide | Secure checkout | Not made to explain",
  },
  { key: "collection_heading", label: "Collection heading", group: "Homepage", defaultValue: "THE FIRST COLLECTION" },
  {
    key: "collection_subheading",
    label: "Collection subheading",
    group: "Homepage",
    defaultValue: "Designed with intention. Made to be worn.",
  },
  { key: "editorial_heading", label: "Editorial heading", group: "Homepage", defaultValue: "NOT MADE TO EXPLAIN." },
  {
    key: "editorial_images",
    label: "Editorial photos (image paths, one per line; phones show the first two; transparent cut-outs work best)",
    group: "Homepage",
    multiline: true,
    defaultValue: [
      "/images/editorial/hoodie-black-front-model.webp",
      "/images/editorial/hoodie-brown-front-model.webp",
      "/images/editorial/hoodie-black-angle-model.webp",
      "/images/editorial/hoodie-brown-open-model.webp",
    ].join("\n"),
  },
  {
    key: "editorial_body",
    label: "Editorial text",
    group: "Homepage",
    multiline: true,
    defaultValue:
      "NEVERHOLLOW is an independent clothing label built around silhouette, detail, and restraint. We believe the strongest pieces don’t need to compete for attention.",
  },
  {
    key: "spotlight_body",
    label: "Spotlight text",
    group: "Homepage",
    multiline: true,
    defaultValue: "Choose a view to look closer. Open any image full screen to zoom.",
  },
  { key: "newsletter_heading", label: "Newsletter heading", group: "Homepage", defaultValue: "BE FIRST." },
  {
    key: "newsletter_body",
    label: "Newsletter text",
    group: "Homepage",
    multiline: true,
    defaultValue: "Early access to releases, exclusive announcements, and the first NEVERHOLLOW collection.",
  },
  {
    key: "newsletter_consent",
    label: "Newsletter consent text",
    group: "Homepage",
    multiline: true,
    defaultValue:
      "I agree to receive emails from NEVERHOLLOW about releases and announcements. I can unsubscribe at any time.",
  },
  {
    key: "about_body",
    label: "About introduction",
    group: "About",
    multiline: true,
    defaultValue:
      "NEVERHOLLOW is built on the idea that clothing should speak through its construction, silhouette, and presence.\n\nNo unnecessary noise. No forced identity.\n\nJust considered pieces designed to exist beyond a moment.",
  },
  {
    key: "about_brand",
    label: "The Brand",
    group: "About",
    multiline: true,
    defaultValue:
      "An independent, unisex label. Dark, oversized pieces with branding kept to a line of script or a small monogram — present when you look for it, quiet when you don’t.",
  },
  {
    key: "about_approach",
    label: "Our Approach",
    group: "About",
    multiline: true,
    defaultValue:
      "Each piece starts with its silhouette. Proportion comes first, then the details that only show up close: a label, a cuff, the way a line of script follows a sleeve.",
  },
  {
    key: "about_philosophy",
    label: "Design Philosophy",
    group: "About",
    multiline: true,
    defaultValue:
      "Restraint over volume. A small palette of black, charcoal and silver-gray, so that shape and detail carry the design rather than color or logos.",
  },
  {
    key: "about_future",
    label: "Future Collections",
    group: "About",
    multiline: true,
    defaultValue:
      "Drop 001 is the first collection. Later releases will be announced to the mailing list first.",
  },
  {
    key: "page_shipping",
    label: "Shipping page (the rates table is added automatically from Shipping)",
    group: "Pages",
    multiline: true,
    defaultValue: `We ship worldwide. Rates and delivery estimates for each destination are listed below, and the exact shipping cost is shown in your bag and at checkout before you pay.

Delivery estimates start once your order leaves us. They depend on the carrier and on customs in your country, so they are estimates rather than guarantees.

When your order ships, we email you the carrier and a tracking link where one is available.

Please check your shipping address at checkout. We can’t redirect a parcel once it has left us, and a parcel returned to us as undeliverable is re-sent at your cost.

If your order arrives damaged or isn’t what you ordered, email us at {contact_email} as soon as you can, with your order number and photos, and we’ll put it right.`,
  },
  {
    key: "page_returns",
    label: "Returns page",
    group: "Pages",
    multiline: true,
    defaultValue: `All sales are final. We don’t accept returns or exchanges, so please check the size guide and product details before you order, and email us at {contact_email} if you’re unsure about anything.

DAMAGED OR INCORRECT ITEMS
If your order arrives damaged or faulty, or isn’t what you ordered, email us as soon as you can with your order number and photos. We’ll replace the item or refund you in full, including the original shipping.

YOUR LEGAL RIGHTS
This policy doesn’t limit any rights you have under the law where you live. If you’re in the UK, the EU or another country that gives online shoppers a right to cancel (usually within 14 days of delivery), that right still applies: email us within that period to say you’re cancelling, then send the item back unworn and with its tags within 14 days. We refund the item price and the standard shipping charge within 14 days of receiving it back. Return postage is paid by you.

Refunds go back to the original payment method. Your bank may take a few days to show them.`,
  },
  {
    key: "page_privacy",
    label: "Privacy Policy",
    group: "Pages",
    multiline: true,
    defaultValue: `This policy explains what NEVERHOLLOW (“we”, “us”) collects when you use this website, why, and the choices you have. Questions: {contact_email}.

WHAT WE COLLECT
Orders: your name, email address, phone number, shipping address and what you bought. Payment is handled by {payment_processor} on its own secure checkout page; we never see or store your card number.
Account (optional): your email address, name, saved addresses, wishlist and order history.
Newsletter and Notify me (optional): your email address, when you agreed, and which piece you asked about.
On your device: your bag, wishlist, recently viewed pieces, and whether you’ve seen the intro are kept in your browser so the site remembers them. If you sign in, a cookie keeps you signed in. We don’t use advertising or analytics cookies.
Emails you send us.

WHY WE USE IT
To take, deliver and support your order; to run your account; to send the release emails you asked for; to prevent fraud; and to meet tax and accounting obligations. Where the law asks for a legal basis, it is performing our contract with you (orders and accounts), your consent (newsletter — withdraw it at any time with the unsubscribe link or by emailing us), and our legitimate interest in running a secure shop and meeting our legal duties.

WHO WE SHARE IT WITH
Only the services that run the shop for us, each under its own privacy and security terms: {payment_processor} (payments and fraud prevention), Supabase (database and accounts), our website host, our email provider (order emails) and the carriers that deliver your parcel. We don’t sell your personal information or share it for advertising.

INTERNATIONAL TRANSFERS
These services may process data in the United States and other countries. Where required, they use recognised safeguards such as the EU Standard Contractual Clauses.

HOW LONG WE KEEP IT
Order records are kept for as long as tax and accounting law requires. Account details are kept until you ask us to delete your account. Newsletter addresses are kept until you unsubscribe.

YOUR RIGHTS
You can ask for a copy of your data, ask us to correct or delete it, or object to how we use it, by emailing {contact_email}. Depending on where you live (for example the EU, the UK or California), you may also complain to your data protection authority.

CHANGES
If we change this policy, we’ll update this page.`,
  },
  {
    key: "page_terms",
    label: "Terms of Service",
    group: "Pages",
    multiline: true,
    defaultValue: `These terms apply when you use this website or buy from NEVERHOLLOW. By placing an order you agree to them. Questions: {contact_email}.

ORDERS
Your order is accepted when payment is confirmed and we send your order confirmation. We may cancel an order and refund it in full if an item turns out to be unavailable, if a price was clearly wrong, or if we suspect fraud.

PRICES AND PAYMENT
Prices are shown in the store currency. Shipping, and tax where it applies, are shown at checkout before you pay. Payment is taken by {payment_processor} when you place your order.

SHIPPING, CUSTOMS AND DUTIES
Delivery times are estimates. The risk in your order passes to you on delivery. International orders may be charged import duties and taxes by the destination country; these are paid by you unless checkout shows them as included.

RETURNS
All sales are final, as set out in our Returns policy, which also covers damaged or incorrect items and any legal right to cancel you have where you live.

PRODUCTS
We describe and photograph every piece as accurately as we can, but colours vary between screens. Quantities are limited and sold first come, first served.

PROMOTIONS
Promotion codes carry the conditions stated when they’re issued, can’t be exchanged for cash and may be withdrawn at any time.

ACCOUNTS
Keep your sign-in details private; you’re responsible for activity on your account. We may suspend accounts used for fraud or abuse.

INTELLECTUAL PROPERTY
The NEVERHOLLOW name, logos, designs, photographs and text on this site belong to NEVERHOLLOW and may not be used without permission.

LIABILITY
Nothing in these terms limits liability that can’t be limited by law, or your statutory rights as a consumer. Otherwise, our total liability for an order is limited to the amount you paid for it.

CHANGES
We may update these terms. The version on this page when you place an order applies to that order.

GOVERNING LAW
These terms are governed by the laws of the place where NEVERHOLLOW is established. If you’re a consumer, you also keep the protection of the mandatory laws of the country where you live.`,
  },
  {
    key: "page_contact",
    label: "Contact page",
    group: "Pages",
    multiline: true,
    defaultValue: "For questions about an order, sizing or anything else, email us. Include your order number if you have one.",
  },
  {
    key: "duties_disclosure",
    label: "Customs and duties notice",
    group: "Pages",
    multiline: true,
    defaultValue:
      "International orders may be charged import duties and taxes by the destination country. These aren’t included in our prices or shipping, and are paid by you to the carrier or customs on delivery.",
  },
  {
    key: "faq_extra",
    label: "Extra FAQ questions (the FAQ page already answers shipping, sizing, payment, duties, tracking and reviews from your settings). Leave a blank line between questions; the first line of each is the question.",
    group: "Pages",
    multiline: true,
    defaultValue: "",
  },
  {
    key: "business_name",
    label: "Legal business name, e.g. NEVERHOLLOW LLC (shown in the footer, on Contact and in the Terms)",
    group: "Business",
    defaultValue: "",
  },
  {
    key: "business_address",
    label: "Business address (shown on Contact; sellers to the EU and UK must show one)",
    group: "Business",
    multiline: true,
    defaultValue: "",
  },
  {
    key: "payment_methods_note",
    label: "Payment methods line in the bag",
    group: "Checkout",
    defaultValue: "Pay by debit or credit card, or PayPal.",
  },
  {
    key: "checkout_note",
    label: "Note at checkout (shown in the bag, just before paying)",
    group: "Checkout",
    multiline: true,
    defaultValue:
      "All sales are final — no returns or exchanges. Damaged or incorrect items are replaced or refunded.",
  },
] as const satisfies readonly ContentField[];

export type ContentKey = (typeof CONTENT_FIELDS)[number]["key"];
export type SiteContent = Record<ContentKey, string>;

export const DEFAULT_CONTENT = Object.fromEntries(
  CONTENT_FIELDS.map((f) => [f.key, f.defaultValue]),
) as SiteContent;

/**
 * Older saved copies of the policies named Stripe outright; the payment company is now filled
 * in from what the store actually uses, so saved text never names the wrong one.
 */
const LEGACY_PROCESSOR: [string, string][] = [
  ["Payment is handled by Stripe on its own secure checkout page", "Payment is handled by {payment_processor} on its own secure checkout page"],
  ["Stripe (payments and fraud prevention)", "{payment_processor} (payments and fraud prevention)"],
  ["Payment is taken by Stripe when you place your order.", "Payment is taken by {payment_processor} when you place your order."],
  ["Pay by card, Apple Pay or Cash App Pay.", "Pay by card, Apple Pay, Google Pay or Cash App Pay."],
  // The ticker once promised wallets the current checkout may not offer.
  ["| Apple Pay and Cash App Pay |", "| Secure checkout |"],
];

export function mergeContent(rows: { key: string; value: string }[] | null | undefined): SiteContent {
  const out = { ...DEFAULT_CONTENT };
  for (const row of rows ?? []) {
    if (!(row.key in out) || !row.value.trim()) continue;
    out[row.key as ContentKey] = LEGACY_PROCESSOR.reduce((v, [from, to]) => v.replaceAll(from, to), row.value);
  }
  return out;
}

export const INFO_PAGES = {
  shipping: { title: "Shipping", key: "page_shipping" },
  returns: { title: "Returns", key: "page_returns" },
  privacy: { title: "Privacy Policy", key: "page_privacy" },
  terms: { title: "Terms of Service", key: "page_terms" },
  contact: { title: "Contact", key: "page_contact" },
  faq: { title: "FAQ", key: "faq_extra" },
} as const satisfies Record<string, { title: string; key: ContentKey }>;
export type InfoSlug = keyof typeof INFO_PAGES;

/** Fills {contact_email} and {payment_processor} in policy text. */
export function fillContact(text: string, contactEmail: string | null, processor?: string | null): string {
  return text
    .replaceAll("{contact_email}", contactEmail ?? "the address on our Contact page")
    .replaceAll("{payment_processor}", processor ?? "our payment provider");
}
