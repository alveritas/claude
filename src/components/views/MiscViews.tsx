"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { Monogram, Wordmark } from "@/components/brand/Brand";
import { CartLines, CheckoutBox, EmptyBag } from "@/components/cart/CartContents";
import { Reveal } from "@/components/layout/Ambient";
import { ProductCard } from "@/components/product/ProductCard";
import { groupFamilies } from "@/lib/shared/colorways";
import { useCart } from "@/components/providers/CartProvider";
import { useStore } from "@/components/providers/StoreProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { fillContact, INFO_PAGES, type InfoSlug } from "@/lib/shared/content";
import { describeCountries, WORLDWIDE } from "@/lib/shared/countries";
import { dayRange } from "@/lib/shared/shipping";
import { formatPrice } from "@/lib/shared/format";
import { PlusIcon } from "@/components/ui/Icons";

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-8 md:mb-12">
      <h1 className="page-title">{children}</h1>
      {sub && <p className="muted mt-3 text-[0.875rem]">{sub}</p>}
    </div>
  );
}

export function CartView() {
  const { lines, ready } = useCart();
  const { commerce } = useStore();
  return (
    <div className="shell pb-24 pt-10 md:pt-16">
      <PageTitle>Bag</PageTitle>
      {!ready ? (
        <div className="skeleton h-40" aria-hidden="true" />
      ) : lines.length === 0 ? (
        <EmptyBag />
      ) : (
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-20">
          <div className="border-t border-rule">
            <CartLines />
          </div>
          <aside aria-label="Order summary" className="md:sticky md:top-[calc(var(--hdr-h)+24px)] md:self-start">
            <div className="border border-rule bg-surface p-6">
              <CheckoutBox />
            </div>
            <p className="muted mt-4 text-[0.75rem]">
              Next you’ll add your shipping details, then pay on {commerce.processor ? `${commerce.processor}’s` : "a"} secure
              page. Card details never touch this site.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

export function WishlistView() {
  const { products } = useStore();
  const { ids, signedIn } = useWishlist();
  const saved = products.filter((p) => ids.includes(p.id));
  return (
    <div className="shell pb-24 pt-10 md:pt-16">
      <PageTitle
        sub={
          signedIn
            ? "Saved to your account."
            : "Saved on this device. Sign in to keep your wishlist across devices."
        }
      >
        Wishlist
      </PageTitle>
      {saved.length ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-4">
          {groupFamilies(saved, products).map((f) => (
            <ProductCard key={f.key} product={f.lead} members={f.members} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-6">
          <p className="text-[1.125rem] font-light">Nothing saved yet. Use the heart on any piece to keep it here.</p>
          <Link href="/shop" className="btn btn-line">
            Explore the collection
          </Link>
        </div>
      )}
    </div>
  );
}

export function AboutView() {
  const { content, products } = useStore();
  const waffle = products.find((p) => p.slug === "vow-waffle-long-sleeve") ?? products[0];
  const detail = waffle?.images.find((i) => i.label.toLowerCase().includes("sleeve")) ?? waffle?.images[0];
  const texture = waffle?.images.find((i) => i.label.toLowerCase().includes("texture")) ?? waffle?.images[1];
  const sections = [
    { title: "The Brand", body: content.about_brand },
    { title: "Our Approach", body: content.about_approach },
    { title: "Design Philosophy", body: content.about_philosophy },
    { title: "Future Collections", body: content.about_future },
  ];
  return (
    <div className="pb-24">
      <section className="shell flex flex-col items-center pb-20 pt-16 text-center md:pb-32 md:pt-28">
        <h1 className="w-[min(86vw,620px)]">
          <Wordmark className="w-full" priority sizes="620px" />
        </h1>
        <p className="mx-auto mt-12 max-w-[34ch] whitespace-pre-line text-[1.25rem] font-extralight leading-[1.55] md:text-[1.625rem]">
          {content.about_body}
        </p>
      </section>

      {detail && texture && (
        <div className="shell grid grid-cols-2 gap-px">
          {[detail, texture].map((im) => (
            <div key={im.id} className="frame aspect-[4/5]">
              <Image
                src={im.url}
                alt={im.alt}
                fill
                sizes="50vw"
                className="object-cover"
                style={{ objectPosition: im.focal, filter: "grayscale(1)" }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="shell mt-20 md:mt-32">
        {sections.map((s) => (
          <Reveal key={s.title} className="grid gap-4 border-t border-rule py-10 md:grid-cols-[1fr_1.4fr] md:gap-16 md:py-14">
            <h2 className="text-[1.25rem] font-light md:text-[1.5rem]">{s.title}</h2>
            <p className="prose-nh text-[1rem] leading-relaxed">{s.body}</p>
          </Reveal>
        ))}
      </div>

      <div className="shell mt-16 flex flex-col items-center gap-8 text-center md:mt-24">
        <Monogram className="w-[90px] opacity-80" sizes="90px" />
        <Link href="/shop" className="btn btn-line">
          Explore collection
        </Link>
      </div>
    </div>
  );
}

/** "Operated by NEVERHOLLOW LLC, 12 Example St…" once the business details are filled in. */
function BusinessLine() {
  const { content } = useStore();
  if (!content.business_name.trim()) return null;
  const address = content.business_address.trim().replace(/\s*\n\s*/g, ", ");
  return (
    <p className="muted mb-8 text-[0.875rem]">
      This site is operated by {content.business_name.trim()}
      {address ? `, ${address}` : ""}.
    </p>
  );
}

export function InfoView({ slug }: { slug: InfoSlug }) {
  const { content, settings, zones, commerce } = useStore();
  const page = INFO_PAGES[slug];
  if (slug === "faq") return <FaqView />;
  return (
    <div className="shell pb-24 pt-10 md:pt-16">
      <PageTitle>{page.title}</PageTitle>
      {(slug === "terms" || slug === "privacy") && <BusinessLine />}
      <div className="prose-nh text-[1rem] leading-relaxed">{fillContact(content[page.key], settings.contactEmail, commerce.processor)}</div>
      {slug === "contact" && content.business_name.trim() && (
        <address className="mt-8 whitespace-pre-line text-[0.9375rem] not-italic leading-relaxed">
          {content.business_name.trim()}
          {content.business_address.trim() ? `\n${content.business_address.trim()}` : ""}
        </address>
      )}
      {slug === "contact" && (
        <p className="mt-8 text-[1rem]">
          {settings.contactEmail ? (
            <a href={`mailto:${settings.contactEmail}`} className="text-link">
              {settings.contactEmail}
            </a>
          ) : (
            <span className="muted">A contact address will be published soon.</span>
          )}
        </p>
      )}
      {slug === "shipping" && zones.some((z) => z.isActive) && <ShippingTable />}
      {slug === "shipping" && <p className="prose-nh mt-10 text-[0.875rem]">{fillContact(content.duties_disclosure, settings.contactEmail, commerce.processor)}</p>}
    </div>
  );
}

/**
 * Answers built from the store's real settings (shipping zones, dispatch time, payment methods,
 * policies), so they always match how the store works, plus any extra questions from the admin.
 */
function FaqView() {
  const { content, settings, zones, commerce } = useStore();
  const email = settings.contactEmail;
  const contact = email ? (
    <a href={`mailto:${email}`} className="text-link">
      {email}
    </a>
  ) : (
    <Link href="/info/contact" className="text-link">
      our Contact page
    </Link>
  );
  const dispatch = dayRange(settings.dispatchMinDays, settings.dispatchMaxDays);
  const active = zones
    .filter((z) => z.isActive)
    .sort((a, b) => Number(a.countries.includes(WORLDWIDE)) - Number(b.countries.includes(WORLDWIDE)));
  const money = (c: number) => formatPrice(c, settings.currency);
  const extra = content.faq_extra
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const [q, ...rest] = b.split("\n");
      return { q: q.trim(), a: rest.join("\n").trim() };
    })
    .filter((x) => x.q && x.a);

  const items: { q: string; a: ReactNode }[] = [
    {
      q: "When will my order ship?",
      a: (
        <>
          {dispatch ? `Orders are packed and handed to the carrier within ${dispatch}. ` : ""}
          As soon as your order ships we email you the carrier and a tracking link.
        </>
      ),
    },
    {
      q: "Where do you ship, and how much is it?",
      a: active.length ? (
        <>
          {active.map((z) => {
            const where = z.countries.includes(WORLDWIDE) ? "Everywhere else" : describeCountries(z.countries);
            const days = dayRange(z.minDays, z.maxDays);
            return (
              <span key={z.id} className="block">
                {where}: {z.rateCents ? money(z.rateCents) : "free"}
                {z.freeOverCents != null && z.rateCents ? `, free over ${money(z.freeOverCents)}` : ""}
                {days ? `, usually ${days} in transit` : ""}.
              </span>
            );
          })}
          <span className="mt-2 block">
            The exact cost for your address is shown at checkout before you pay. Full details on the{" "}
            <Link href="/info/shipping" className="text-link">
              Shipping
            </Link>{" "}
            page.
          </span>
        </>
      ) : (
        "Shipping destinations and rates are published when orders open."
      ),
    },
    {
      q: "Will I pay customs or import duties?",
      a: fillContact(content.duties_disclosure, email),
    },
    {
      q: "Can I return or exchange something?",
      a: (
        <>
          {fillContact(content.checkout_note, email)} Read the full{" "}
          <Link href="/info/returns" className="text-link">
            Returns policy
          </Link>
          .
        </>
      ),
    },
    {
      q: "How do I find my size?",
      a: (
        <>
          Each product page has a size guide with the piece’s measurements and fit notes, and reviews show how verified buyers
          found the fit. Still unsure? Email {contact} with your usual size and we’ll help you choose.
        </>
      ),
    },
    {
      q: "How can I pay? Is checkout secure?",
      a: `${commerce.methods ?? content.payment_methods_note} Payment is handled by ${commerce.processor ?? "our payment provider"} on its secure checkout page; your card details never reach our servers.`,
    },
    {
      q: "How do I track my order?",
      a: "Use the tracking link in your shipping email. If you were signed in when you ordered, your orders are also listed under Account.",
    },
    {
      q: "Are the reviews real?",
      a: "Yes. A review can only be left from the private link sent to the buyer with their order, so every review is from a verified purchase. We don’t remove reviews for being critical.",
    },
    ...extra.map((x) => ({ q: x.q, a: x.a })),
    {
      q: "How do I contact you?",
      a: <>Email {contact}. Include your order number if you have one.</>,
    },
  ];

  return (
    <div className="shell pb-24 pt-10 md:pt-16">
      <PageTitle>FAQ</PageTitle>
      <div className="max-w-3xl border-t border-rule">
        {items.map((it, i) => (
          <details key={it.q} className="acc border-b border-rule" open={i === 0}>
            <summary>
              {it.q}
              <PlusIcon size={14} className="acc-icon" />
            </summary>
            <div className="acc-body text-[0.9375rem] leading-relaxed">{it.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}

function ShippingTable() {
  const { zones, settings } = useStore();
  const fmt = (c: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: settings.currency.toUpperCase() }).format(c / 100);
  const dispatch = dayRange(settings.dispatchMinDays, settings.dispatchMaxDays);
  // Named countries first, "everywhere else" last.
  const rows = zones
    .filter((z) => z.isActive)
    .sort((a, b) => Number(a.countries.includes(WORLDWIDE)) - Number(b.countries.includes(WORLDWIDE)));
  return (
    <>
    {dispatch && <p className="mt-10 text-[0.9375rem]">Orders are packed and handed to the carrier within {dispatch}.</p>}
    <table className="mt-10 w-full max-w-3xl text-left text-[0.875rem]">
      <caption className="caps muted mb-4 text-left">Destinations</caption>
      <thead className="muted text-[0.75rem]">
        <tr className="border-b border-rule">
          <th className="py-3 font-normal">Zone</th>
          <th className="py-3 font-normal">Rate</th>
          <th className="py-3 font-normal">Delivery after dispatch</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((z) => (
          <tr key={z.id} className="border-b border-rule align-top">
            <td className="py-3 pr-4">
              {z.name}
              <span className="muted block text-[0.75rem]">{describeCountries(z.countries)}</span>
            </td>
            <td className="py-3 pr-4">
              {z.rateCents === 0 ? "Free" : fmt(z.rateCents)}
              {z.freeOverCents != null && <span className="muted block text-[0.75rem]">Free over {fmt(z.freeOverCents)}</span>}
            </td>
            <td className="py-3">{dayRange(z.minDays, z.maxDays) ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </>
  );
}

export function CollectionsView() {
  const { collections, products } = useStore();
  return (
    <div className="shell pb-24 pt-10 md:pt-16">
      <PageTitle>Collections</PageTitle>
      {collections.length === 0 && <p className="muted">Collections will appear here.</p>}
      <div className="grid gap-px">
        {collections.map((c) => {
          // One photo and one count per piece, not per colour.
          const items = groupFamilies(products.filter((p) => p.collectionId === c.id));
          const frames = items.flatMap((f) => f.lead.images.slice(0, 1)).slice(0, 4);
          return (
            <Link key={c.id} href={`/collections/${c.slug}`} className="card group block">
              <div className="grid grid-cols-2 gap-px md:grid-cols-4">
                {frames.map((im, i) => (
                  <div key={im.id} className={`frame aspect-[4/5] ${i > 1 ? "max-md:hidden" : ""}`}>
                    <Image src={im.url} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" style={{ objectPosition: im.focal }} />
                  </div>
                ))}
              </div>
              <div className="flex items-baseline justify-between border-b border-rule py-6">
                <h2 className="text-[1.5rem] font-light md:text-[2rem]">{c.name}</h2>
                <span className="muted text-[0.8125rem]">
                  {items.length} {items.length === 1 ? "piece" : "pieces"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function NotFoundView() {
  return (
    <div className="shell flex min-h-[60vh] flex-col items-start justify-center gap-6 py-24">
      <PageTitle sub="This page doesn’t exist, or it has moved.">Not found</PageTitle>
      <Link href="/shop" className="btn btn-line">
        Go to the shop
      </Link>
    </div>
  );
}

/** Shown after the payment page sends the buyer back. "Confirmed" only when the server verified payment. */
export function CheckoutSuccessView({
  paid,
  email,
  orderRef,
  confirming = false,
  receivedBy,
}: {
  paid: boolean;
  email: string | null;
  orderRef: string | null;
  /** The payment company hasn't confirmed yet: check again in a moment. */
  confirming?: boolean;
  /**
   * Back from the payment company's page, but this site can't check the payment itself (no
   * database yet): the payment company's receipt email is the confirmation. Never says "paid".
   */
  receivedBy?: string;
}) {
  const { clear } = useCart();
  useEffect(() => {
    if (paid || receivedBy) clear();
  }, [paid, receivedBy, clear]);
  if (receivedBy) {
    return (
      <div className="shell flex min-h-[60vh] flex-col items-start justify-center gap-6 py-24">
        <PageTitle
          sub={`Once ${receivedBy} confirms your payment, they email your receipt. We’ll email you again when your order ships.`}
        >
          Thanks for your order
        </PageTitle>
        <Link href="/shop" className="btn btn-line">
          Continue browsing
        </Link>
      </div>
    );
  }
  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => {
      const u = new URL(window.location.href);
      u.searchParams.set("try", String(Number(u.searchParams.get("try") ?? "0") + 1));
      window.location.replace(u.toString());
    }, 2500);
    return () => window.clearTimeout(t);
  }, [confirming]);
  if (confirming) {
    return (
      <div className="shell flex min-h-[60vh] flex-col items-start justify-center gap-6 py-24" aria-live="polite">
        <PageTitle sub="This takes a few seconds. Please keep this page open.">Confirming your payment</PageTitle>
        <div className="skeleton h-1 w-48" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className="shell flex min-h-[60vh] flex-col items-start justify-center gap-6 py-24">
      {paid ? (
        <PageTitle sub={email ? `A confirmation is on its way to ${email}.` : "A confirmation email is on its way."}>
          Thank you
        </PageTitle>
      ) : (
        <PageTitle sub="We haven’t received confirmation from the payment page yet. If you completed payment, your receipt is in your email and your order confirmation will follow. If anything looks wrong, contact us.">
          Payment not confirmed yet
        </PageTitle>
      )}
      {paid && orderRef && <p className="muted text-[0.8125rem]">Order {orderRef}</p>}
      <div className="flex gap-3">
        <Link href="/shop" className="btn btn-line">
          Continue browsing
        </Link>
        {!paid && (
          <Link href="/cart" className="btn btn-solid">
            Back to bag
          </Link>
        )}
      </div>
    </div>
  );
}
