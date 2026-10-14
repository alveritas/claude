"use client";

import { useId, useState, type FormEvent } from "react";
import { requestRestock, subscribeToNewsletter } from "@/lib/client/api";
import { isValidEmail } from "@/lib/shared/format";
import type { ProductVariant } from "@/lib/shared/types";

/**
 * "Notify me" for pieces that can't be bought yet. Adds the email to the mailing list,
 * tagged with the product, so the release email can be sent to the right people.
 */
export function NotifyForm({ productSlug, productName, soldOut }: { productSlug: string; productName: string; soldOut: boolean }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "pending" | "done" | "error"; message?: string }>({ kind: "idle" });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setState({ kind: "error", message: "Enter a valid email address." });
      return;
    }
    setState({ kind: "pending" });
    const res = await subscribeToNewsletter(email.trim(), true, `notify:${productSlug}`.slice(0, 40));
    if (res.ok || res.code === "duplicate") {
      setState({
        kind: "done",
        message: soldOut
          ? `You’re on the list. We’ll email you if ${productName} comes back.`
          : `You’re on the list. We’ll email you when ${productName} is released.`,
      });
    } else {
      setState({ kind: "error", message: res.message });
    }
  };

  if (state.kind === "done") {
    return (
      <p role="status" className="border border-rule px-4 py-4 text-[0.875rem]">
        {state.message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <label htmlFor={`${id}-email`} className="text-[0.8125rem]">
        {soldOut ? "Sold out. Get an email if it comes back." : "Coming soon. Get an email when it’s released."}
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="h-12 min-w-0 flex-1 border border-rule bg-transparent px-4 text-[0.875rem] outline-none placeholder:text-[var(--placeholder)] focus:border-bone"
          aria-invalid={state.kind === "error"}
          aria-describedby={`${id}-msg`}
        />
        <button type="submit" className="btn btn-solid shrink-0" disabled={state.kind === "pending"}>
          {state.kind === "pending" ? "Adding…" : "Notify me"}
        </button>
      </div>
      <p id={`${id}-msg`} role={state.kind === "error" ? "alert" : undefined} className={state.kind === "error" ? "form-error" : "muted text-[0.6875rem] leading-relaxed"}>
        {state.kind === "error" ? state.message : "By signing up you agree to receive NEVERHOLLOW release emails. Unsubscribe at any time."}
      </p>
    </form>
  );
}

/**
 * "Email me when it's back" for sold-out sizes: one email when the chosen size is restocked,
 * nothing else (it doesn't join the newsletter).
 */
export function RestockForm({ productName, sizes, initialSize }: { productName: string; sizes: ProductVariant[]; initialSize?: string | null }) {
  const id = useId();
  const [variantId, setVariantId] = useState(() => sizes.find((v) => v.size === initialSize)?.id ?? (sizes.length === 1 ? sizes[0].id : ""));
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "pending" | "done" | "error"; message?: string }>({ kind: "idle" });
  if (!sizes.length) return null;
  const chosen = sizes.find((v) => v.id === variantId);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!chosen) return setState({ kind: "error", message: "Choose the size you want." });
    if (!isValidEmail(email)) return setState({ kind: "error", message: "Enter a valid email address." });
    setState({ kind: "pending" });
    const res = await requestRestock(email.trim(), chosen.id);
    if (res.ok) setState({ kind: "done", message: `Done. We’ll email you once when ${productName} is back in ${chosen.size}.` });
    else setState({ kind: "error", message: res.message });
  };

  if (state.kind === "done") {
    return (
      <p role="status" className="border border-rule px-4 py-4 text-[0.875rem]">
        {state.message}
      </p>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3" aria-label="Back-in-stock email">
      <p className="text-[0.8125rem]">
        {sizes.length === 1 ? `${sizes[0].size} is sold out.` : "Sold out in your size?"} Get an email when it’s back.
      </p>
      <div className="flex flex-wrap gap-2">
        {sizes.length > 1 && (
          <>
            <label htmlFor={`${id}-size`} className="sr-only">
              Size
            </label>
            <select
              id={`${id}-size`}
              className="h-12 border border-rule bg-transparent px-3 text-[0.875rem] outline-none focus:border-bone"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            >
              <option value="">Size</option>
              {sizes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.size}
                </option>
              ))}
            </select>
          </>
        )}
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="h-12 min-w-[180px] flex-1 border border-rule bg-transparent px-4 text-[0.875rem] outline-none placeholder:text-[var(--placeholder)] focus:border-bone"
          aria-invalid={state.kind === "error"}
          aria-describedby={`${id}-msg`}
        />
        <button type="submit" className="btn btn-solid shrink-0" disabled={state.kind === "pending"}>
          {state.kind === "pending" ? "Saving…" : "Notify me"}
        </button>
      </div>
      <p id={`${id}-msg`} role={state.kind === "error" ? "alert" : undefined} className={state.kind === "error" ? "form-error" : "muted text-[0.6875rem] leading-relaxed"}>
        {state.kind === "error" ? state.message : "One email when it’s restocked. You won’t be added to the newsletter."}
      </p>
    </form>
  );
}
