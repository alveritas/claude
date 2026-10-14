"use client";

import type { ApiResult, CartLine } from "@/lib/shared/types";

async function post<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (json && typeof json.ok === "boolean") return json as ApiResult<T>;
    return { ok: false, code: "bad_response", message: "Something went wrong. Try again in a moment." };
  } catch {
    return { ok: false, code: "network", message: "You appear to be offline. Check your connection and try again." };
  }
}

export function subscribeToNewsletter(email: string, consent: boolean, source: string) {
  return post<undefined>("/api/newsletter", { email, consent, source });
}

export function startCheckout(lines: CartLine[], country: string) {
  return post<{ url: string }>("/api/checkout", { lines, country });
}

export function syncWishlist(action: "merge" | "add" | "remove", productIds: string[]) {
  return post<{ productIds: string[] }>("/api/wishlist", { action, productIds });
}
