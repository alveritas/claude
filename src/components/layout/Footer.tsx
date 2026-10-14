"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/Brand";
import { NewsletterForm } from "@/components/home/NewsletterForm";
import { useStore } from "@/components/providers/StoreProvider";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/shared/types";

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="caps muted mb-5">{title}</h2>
      <ul className="flex flex-col gap-3 text-[0.8125rem]">{children}</ul>
    </div>
  );
}

const linkCls = "hover:opacity-60";

export function Footer() {
  const { settings, content, products, commerce } = useStore();
  // The homepage has its own signup section right above the footer, so the footer one is left out there.
  const showSignup = usePathname() !== "/";
  const year = new Date().getFullYear();
  const cats = CATEGORIES.filter((c) => products.some((p) => p.category === c));
  const socials = [
    { label: "Instagram", href: settings.instagramUrl },
    { label: "TikTok", href: settings.tiktokUrl },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <footer className="border-t border-rule bg-ink">
      <div className="shell grid gap-12 py-16 md:py-20 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-10">
        <div className="max-w-sm">
          <Wordmark className="w-[180px]" sizes="180px" />
          {showSignup ? (
            <>
              <p className="section-title mt-8">Join the list</p>
              <p className="muted mt-2 text-[0.8125rem] leading-relaxed">
                New drops, restocks and exclusive releases.
              </p>
              <NewsletterForm consentText={content.newsletter_consent} source="footer" compact />
            </>
          ) : (
            <p className="muted mt-6 max-w-[34ch] text-[0.8125rem] leading-relaxed">
              Independent unisex streetwear. {settings.mode === "live" ? "Drop 001 is out now." : "Drop 001 is coming soon."}
            </p>
          )}
        </div>
        <Col title="Shop">
          <li><Link href="/shop" className={linkCls}>All products</Link></li>
          {cats.map((c) => (
            <li key={c}><Link href={`/shop?category=${c}`} className={linkCls}>{CATEGORY_LABELS[c]}</Link></li>
          ))}
          <li><Link href="/collections" className={linkCls}>Collections</Link></li>
        </Col>
        <Col title="Help">
          <li><Link href="/info/contact" className={linkCls}>Contact</Link></li>
          <li><Link href="/info/shipping" className={linkCls}>Shipping</Link></li>
          <li><Link href="/info/returns" className={linkCls}>Returns</Link></li>
          <li><Link href="/info/faq" className={linkCls}>FAQ</Link></li>
          <li><Link href="/account" className={linkCls}>Account</Link></li>
          {settings.contactEmail && (
            <li className="pt-2">
              <a href={`mailto:${settings.contactEmail}`} className={`muted ${linkCls}`}>{settings.contactEmail}</a>
            </li>
          )}
        </Col>
        <Col title="Brand">
          <li><Link href="/about" className={linkCls}>About</Link></li>
          <li><Link href="/info/privacy" className={linkCls}>Privacy Policy</Link></li>
          <li><Link href="/info/terms" className={linkCls}>Terms of Service</Link></li>
          {socials.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkCls}>{s.label}</a>
            </li>
          ))}
        </Col>
      </div>
      <div className="shell flex flex-col gap-3 border-t border-rule py-6 text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--faint)] md:flex-row md:items-center md:justify-between">
        <p>© {year} {content.business_name.trim() || "NEVERHOLLOW"}. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {settings.mode === "live" && (
            <p>
              Secure checkout{commerce.processor ? ` by ${commerce.processor}` : ""} · {(commerce.methods ?? content.payment_methods_note).replace(/^Pay by\s*/i, "").replace(/\.$/, "")}
            </p>
          )}
          <p>Prices in {settings.currency.toUpperCase()}</p>
        </div>
      </div>
    </footer>
  );
}
