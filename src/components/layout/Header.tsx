"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Monogram, Wordmark } from "@/components/brand/Brand";
import { useCart } from "@/components/providers/CartProvider";
import { useStore } from "@/components/providers/StoreProvider";
import { useUI } from "@/components/providers/UIProvider";
import { BagIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/ui/Icons";
import { usePrefersReducedMotion } from "@/lib/client/hooks";
import { CATEGORIES, CATEGORY_LABELS, type Product } from "@/lib/shared/types";

const NAV = [
  { href: "/collections", label: "Collections" },
  { href: "/about", label: "About" },
];

/** Announcement messages are separated by "|" in Admin → Launch and rotate one at a time. */
function Announcement({ text }: { text: string }) {
  const messages = useMemo(
    () =>
      text
        .split("|")
        .map((m) => m.trim())
        .filter(Boolean),
    [text],
  );
  const reduced = usePrefersReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced || messages.length < 2) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % messages.length), 4500);
    return () => window.clearInterval(t);
  }, [reduced, messages.length]);
  if (!messages.length) return null;
  return (
    <div className="relative h-[var(--ann-h)] overflow-hidden bg-surface px-4 text-center text-[0.6875rem] uppercase tracking-[0.16em] text-silver">
      {messages.map((m, n) => (
        <p key={m} className="ann-msg px-4" data-active={n === i} aria-hidden={n !== i}>
          <span className="truncate">{m}</span>
        </p>
      ))}
    </div>
  );
}

/** Desktop shop menu: categories that have pieces, plus two featured pieces. */
function ShopMenu({ open, onClose, products }: { open: boolean; onClose: () => void; products: Product[] }) {
  const cats = CATEGORIES.filter((c) => products.some((p) => p.category === c));
  const featured = useMemo(() => {
    const picks: Product[] = [];
    for (const c of ["hoodies", "footwear", "tops", "bottoms"] as const) {
      const p = products.find((x) => x.category === c && x.images.length);
      if (p && picks.length < 2) picks.push(p);
    }
    return picks;
  }, [products]);
  return (
    <div className="mega max-lg:hidden" data-open={open} aria-hidden={!open}>
      <div className="shell grid grid-cols-[1fr_1fr_1.3fr] gap-10 py-9">
        <div>
          <p className="caps muted mb-5">Shop</p>
          <ul className="flex flex-col gap-3 text-[0.8125rem] uppercase tracking-[0.08em]">
            <li>
              <Link href="/shop" onClick={onClose} className="hover:opacity-60">
                All products
              </Link>
            </li>
            <li>
              <Link href="/shop?sort=newest" onClick={onClose} className="hover:opacity-60">
                New arrivals
              </Link>
            </li>
            <li>
              <Link href="/collections" onClick={onClose} className="hover:opacity-60">
                Collections
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="caps muted mb-5">Categories</p>
          <ul className="flex flex-col gap-3 text-[0.8125rem] uppercase tracking-[0.08em]">
            {cats.map((c) => (
              <li key={c}>
                <Link href={`/shop?category=${c}`} onClick={onClose} className="hover:opacity-60">
                  {CATEGORY_LABELS[c]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="ml-auto grid w-full max-w-[440px] grid-cols-2 gap-4">
          {featured.map((p) => (
            <Link key={p.id} href={`/products/${p.slug}`} onClick={onClose} className="group block">
              <div className="frame aspect-[4/5]">
                <Image
                  src={p.images[0].url}
                  alt={p.images[0].alt}
                  fill
                  sizes="220px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  style={{ objectPosition: p.images[0].focal }}
                />
              </div>
              <p className="card-title mt-3">{p.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const { settings, products } = useStore();
  const { open } = useUI();
  const { count, ready } = useCart();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const openMenu = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setMenu(true);
  };
  const closeMenuSoon = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMenu(false), 160);
  };

  const shopActive = pathname === "/shop" || pathname.startsWith("/products/");

  return (
    <div
      className="site-top"
      data-overlay={isHome && !scrolled && !menu}
      data-collapsed={scrolled}
    >
      {settings.announcement && <Announcement text={settings.announcement} />}
      <header className="site-header" onMouseLeave={closeMenuSoon}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-bone focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <div className="shell grid h-full grid-cols-[1fr_auto_1fr] items-center">
          {/* Left */}
          <nav aria-label="Main" className="flex items-center gap-8">
            <button type="button" className="icon-btn -ml-3 lg:hidden" onClick={() => open("menu")} aria-label="Open menu">
              <MenuIcon />
            </button>
            <div className="flex items-center max-lg:hidden" onMouseEnter={openMenu}>
              <Link href="/shop" className="nav-link" aria-current={shopActive ? "page" : undefined}>
                Shop
              </Link>
            </div>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="nav-link max-lg:hidden"
                onMouseEnter={closeMenuSoon}
                aria-current={pathname === n.href || pathname.startsWith(`${n.href}/`) ? "page" : undefined}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Centre */}
          <Link href="/" className="logo block" aria-label="NEVERHOLLOW home">
            <Wordmark className="w-[150px] max-lg:hidden xl:w-[176px]" priority sizes="176px" />
            <Monogram className="w-[46px] lg:hidden" sizes="46px" />
          </Link>

          {/* Right */}
          <div className="-mr-3 flex items-center justify-end">
            <button type="button" className="icon-btn" onClick={() => open("search")} aria-label="Search">
              <SearchIcon />
            </button>
            <Link href="/account" className="icon-btn max-sm:hidden" aria-label="Account">
              <UserIcon />
            </Link>
            <button
              type="button"
              className="icon-btn"
              onClick={() => open("cart")}
              aria-label={`Bag, ${ready ? count : 0} item${count === 1 ? "" : "s"}`}
            >
              <BagIcon />
              {ready && count > 0 && (
                <span key={count} className="badge badge-pop" aria-hidden="true">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
        <div onMouseEnter={openMenu}>
          <ShopMenu open={menu} onClose={() => setMenu(false)} products={products} />
        </div>
      </header>
    </div>
  );
}
