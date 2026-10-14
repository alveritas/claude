"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readJSON, writeJSON } from "@/lib/client/storage";
import { MAX_PER_LINE, resolveCart, type ResolvedLine } from "@/lib/shared/commerce";
import type { CartLine } from "@/lib/shared/types";
import { useStore } from "./StoreProvider";

const KEY = "nh-cart-v1";
const COUNTRY_KEY = "nh-country-v1";

interface CartValue {
  ready: boolean;
  lines: ResolvedLine[];
  rawLines: CartLine[];
  count: number;
  subtotalCents: number;
  add: (productId: string, variantId: string, quantity: number) => void;
  setQuantity: (productId: string, variantId: string, quantity: number) => void;
  remove: (productId: string, variantId: string) => void;
  clear: () => void;
  country: string | null;
  setCountry: (code: string | null) => void;
}

const CartContext = createContext<CartValue | null>(null);

function sanitize(input: unknown): CartLine[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (l): l is CartLine =>
        l &&
        typeof l.productId === "string" &&
        typeof l.variantId === "string" &&
        Number.isInteger(l.quantity) &&
        l.quantity > 0,
    )
    .map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: Math.min(l.quantity, MAX_PER_LINE) }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, settings } = useStore();
  const [raw, setRaw] = useState<CartLine[]>([]);
  const [country, setCountryState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Hydrate after mount so server and client markup match.
  useEffect(() => {
    setRaw(sanitize(readJSON(KEY, [])));
    setCountryState(readJSON<string | null>(COUNTRY_KEY, null));
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setRaw(sanitize(readJSON(KEY, [])));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next: CartLine[]) => {
    setRaw(next);
    writeJSON(KEY, next);
  }, []);

  const add = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      setRaw((prev) => {
        const existing = prev.find((l) => l.productId === productId && l.variantId === variantId);
        const next = existing
          ? prev.map((l) =>
              l === existing ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_PER_LINE) } : l,
            )
          : [...prev, { productId, variantId, quantity: Math.min(quantity, MAX_PER_LINE) }];
        writeJSON(KEY, next);
        return next;
      });
    },
    [],
  );

  const setQuantity = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      setRaw((prev) => {
        const next =
          quantity <= 0
            ? prev.filter((l) => !(l.productId === productId && l.variantId === variantId))
            : prev.map((l) =>
                l.productId === productId && l.variantId === variantId
                  ? { ...l, quantity: Math.min(quantity, MAX_PER_LINE) }
                  : l,
              );
        writeJSON(KEY, next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((p: string, v: string) => setQuantity(p, v, 0), [setQuantity]);
  const clear = useCallback(() => commit([]), [commit]);
  const setCountry = useCallback((code: string | null) => {
    setCountryState(code);
    writeJSON(COUNTRY_KEY, code);
  }, []);

  const resolved = useMemo(() => resolveCart(raw, products, settings), [raw, products, settings]);

  // Drop lines whose product or size no longer exists in the catalogue.
  useEffect(() => {
    if (ready && resolved.missing.length) {
      commit(raw.filter((l) => !resolved.missing.includes(l)));
    }
  }, [ready, resolved.missing, raw, commit]);

  const value = useMemo<CartValue>(
    () => ({
      ready,
      lines: resolved.lines,
      rawLines: raw,
      count: resolved.lines.reduce((s, l) => s + l.line.quantity, 0),
      subtotalCents: resolved.subtotalCents,
      add,
      setQuantity,
      remove,
      clear,
      country,
      setCountry,
    }),
    [ready, resolved, raw, add, setQuantity, remove, clear, country, setCountry],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const v = useContext(CartContext);
  if (!v) throw new Error("useCart must be used inside <CartProvider>");
  return v;
}
