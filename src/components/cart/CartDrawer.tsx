"use client";

import Link from "next/link";
import { useCart } from "@/components/providers/CartProvider";
import { useUI } from "@/components/providers/UIProvider";
import { CloseIcon } from "@/components/ui/Icons";
import { Overlay } from "@/components/ui/Overlay";
import { CartLines, CheckoutBox, EmptyBag } from "./CartContents";

export function CartDrawer() {
  const { panel, close } = useUI();
  const { lines, count } = useCart();
  return (
    <Overlay open={panel === "cart"} onClose={close} label="Shopping bag" variant="drawer">
      <div className="flex h-[var(--hdr-h)] flex-none items-center justify-between border-b border-rule px-5">
        <h2 className="caps">
          Bag <span className="muted">({count})</span>
        </h2>
        <button type="button" className="icon-btn -mr-3" onClick={close} aria-label="Close bag">
          <CloseIcon />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        {lines.length ? <CartLines onNavigate={close} compact /> : <EmptyBag onNavigate={close} />}
      </div>
      {lines.length > 0 && (
        <div className="flex-none border-t border-rule px-5 py-5">
          <CheckoutBox onNavigate={close} />
          <Link href="/cart" onClick={close} className="text-link muted mt-4 inline-block text-[0.75rem]">
            View full bag
          </Link>
        </div>
      )}
    </Overlay>
  );
}
