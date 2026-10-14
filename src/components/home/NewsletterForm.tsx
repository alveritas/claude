"use client";

import { useId, useState, type FormEvent } from "react";
import { subscribeToNewsletter } from "@/lib/client/api";
import { isValidEmail } from "@/lib/shared/format";

type Status =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string; field?: "email" | "consent" };

export function NewsletterForm({ consentText, source, compact = false }: { consentText: string; source: string; compact?: boolean }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setStatus({ kind: "error", field: "email", message: "Enter a valid email address." });
      return;
    }
    if (!consent) {
      setStatus({ kind: "error", field: "consent", message: "Tick the box to agree to release emails." });
      return;
    }
    setStatus({ kind: "pending" });
    const res = await subscribeToNewsletter(email.trim(), consent, source);
    if (res.ok) {
      setStatus({ kind: "success", message: "You’re on the list. New releases reach you first." });
      setEmail("");
      setConsent(false);
    } else if (res.code === "duplicate") {
      setStatus({ kind: "success", message: "That email is already on the list. You’ll hear from us first." });
    } else {
      setStatus({ kind: "error", message: res.message });
    }
  };

  if (status.kind === "success") {
    return (
      <p role="status" className={compact ? "mt-5 text-[0.875rem]" : "mt-8 border-t border-rule pt-6 text-[1rem]"}>
        {status.message}
      </p>
    );
  }

  const emailError = status.kind === "error" && status.field === "email";
  const consentError = status.kind === "error" && status.field === "consent";

  return (
    <form onSubmit={submit} noValidate className={compact ? "mt-5 flex flex-col gap-4" : "mt-8 flex flex-col gap-5"}>
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label htmlFor={`${id}-email`} className="label">
            Email address
          </label>
          <input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            placeholder="you@example.com"
            aria-invalid={emailError}
            aria-describedby={`${id}-msg`}
            required
          />
        </div>
        <button type="submit" className="btn btn-solid" disabled={status.kind === "pending"}>
          {status.kind === "pending" ? "Joining…" : "Join"}
        </button>
      </div>
      <label className={`flex items-start gap-3 leading-relaxed text-silver ${compact ? "text-[0.6875rem]" : "text-[0.75rem]"}`}>
        <input
          type="checkbox"
          className="check"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          aria-invalid={consentError}
          aria-describedby={`${id}-msg`}
        />
        <span>{consentText}</span>
      </label>
      <p id={`${id}-msg`} role={status.kind === "error" ? "alert" : undefined} className="form-error min-h-[1.25rem]">
        {status.kind === "error" ? status.message : ""}
      </p>
    </form>
  );
}
