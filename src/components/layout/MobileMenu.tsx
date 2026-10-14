"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Wordmark } from "@/components/brand/Brand";
import { useStore } from "@/components/providers/StoreProvider";
import { useUI } from "@/components/providers/UIProvider";
import { CloseIcon } from "@/components/ui/Icons";
import { Overlay } from "@/components/ui/Overlay";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/shared/types";

const MORE = [
  { href: "/collections", label: "Collections" },
  { href: "/about", label: "About" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/account", label: "Account" },
];

export function MobileMenu() {
  const { panel, close } = useUI();
  const { products } = useStore();
  const pathname = usePathname();
  useEffect(() => close(), [pathname, close]);
  const cats = CATEGORIES.filter((c) => products.some((p) => p.category === c));

  return (
    <Overlay open={panel === "menu"} onClose={close} label="Menu" variant="drawer-left" className="bg-ink">
      <div className="flex h-[var(--hdr-h)] items-center justify-between border-b border-rule px-4">
        <span className="caps muted">Menu</span>
        <button type="button" className="icon-btn -mr-3" onClick={close} aria-label="Close menu">
          <CloseIcon />
        </button>
      </div>
      <nav aria-label="Mobile" className="flex flex-1 flex-col overflow-y-auto px-4 pb-8 pt-6">
        <p className="caps muted mb-3">Shop</p>
        <ul className="flex flex-col">
          <li>
            <Link href="/shop" className="block border-b border-rule py-4 text-[0.9375rem] uppercase tracking-[0.1em]">
              All products
            </Link>
          </li>
          {cats.map((c) => (
            <li key={c}>
              <Link
                href={`/shop?category=${c}`}
                className="block border-b border-rule py-4 text-[0.9375rem] uppercase tracking-[0.1em]"
              >
                {CATEGORY_LABELS[c]}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="mt-8 flex flex-col gap-4 text-[0.875rem]">
          {MORE.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="muted hover:text-bone" aria-current={pathname === l.href ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="px-4 pb-10">
        <Wordmark className="w-[140px] opacity-80" sizes="160px" />
      </div>
    </Overlay>
  );
}
