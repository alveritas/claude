"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteContent } from "@/lib/shared/content";
import type { Collection, CommerceStatus, Product, RatingTally, ShippingZone, StoreSettings } from "@/lib/shared/types";

export interface StoreValue {
  products: Product[];
  collections: Collection[];
  settings: StoreSettings;
  content: SiteContent;
  zones: ShippingZone[];
  commerce: CommerceStatus;
  /** True when Supabase auth is configured, so account features can be offered. */
  accountsEnabled: boolean;
  /** Published review totals per product id (verified buyers only). */
  ratings: Record<string, RatingTally>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ value, children }: { value: StoreValue; children: ReactNode }) {
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore must be used inside <StoreProvider>");
  return v;
}
