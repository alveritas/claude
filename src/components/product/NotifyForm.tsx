"use client";

import { useId, useState, type FormEvent } from "react";
import { subscribeToNewsletter } from "@/lib/client/api";
import { isValidEmail } from "@/lib/shared/format";

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
