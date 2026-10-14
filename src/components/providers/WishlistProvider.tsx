"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { syncWishlist } from "@/lib/client/api";
import { readJSON, writeJSON } from "@/lib/client/storage";
import { getBrowserSupabase } from "@/lib/client/supabase";
import { useStore } from "./StoreProvider";
import { useUI } from "./UIProvider";

const KEY = "nh-wishlist-v1";

interface WishlistValue {
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string, name?: string) => void;
  signedIn: boolean;
}

const WishlistContext = createContext<WishlistValue | null>(null);

/**
 * Saved pieces live on the device for guests and are merged into the account
 * (Supabase wishlist_items) as soon as the visitor signs in.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { products } = useStore();
  const { notify } = useUI();
  const [ids, setIds] = useState<string[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const merged = useRef(false);

  useEffect(() => {
    setIds(readJSON<string[]>(KEY, []).filter((x) => typeof x === "string"));
  }, []);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const mergeNow = async () => {
      if (merged.current) return;
      merged.current = true;
      const local = readJSON<string[]>(KEY, []);
      const res = await syncWishlist("merge", local);
      if (res.ok) {
        setIds(res.data.productIds);
        writeJSON(KEY, res.data.productIds);
      }
    };
    sb.auth.getUser().then(({ data }) => {
      if (data.user) {
        setSignedIn(true);
        void mergeNow();
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      setSignedIn(Boolean(session?.user));
      if (event === "SIGNED_IN") void mergeNow();
      if (event === "SIGNED_OUT") merged.current = false;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Only keep ids that still exist in the catalogue.
  const visible = useMemo(() => ids.filter((id) => products.some((p) => p.id === id)), [ids, products]);

  const idsRef = useRef(ids);
  idsRef.current = ids;

  const toggle = useCallback(
    (productId: string, name?: string) => {
      const prev = idsRef.current;
      const removing = prev.includes(productId);
      const next = removing ? prev.filter((x) => x !== productId) : [...prev, productId];
      idsRef.current = next;
      setIds(next);
      writeJSON(KEY, next);
      if (signedIn) void syncWishlist(removing ? "remove" : "add", [productId]);
      const label = name ? ` ${name}` : "";
      notify(removing ? `Removed${label} from your wishlist` : `Saved${label} to your wishlist`);
    },
    [signedIn, notify],
  );

  const value = useMemo<WishlistValue>(
    () => ({ ids: visible, has: (id) => visible.includes(id), toggle, signedIn }),
    [visible, toggle, signedIn],
  );
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistValue {
  const v = useContext(WishlistContext);
  if (!v) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return v;
}
