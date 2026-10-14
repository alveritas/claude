"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Monogram } from "@/components/brand/Brand";
import { getBrowserSupabase } from "@/lib/client/supabase";
import { isValidEmail } from "@/lib/shared/format";

type Mode = "login" | "register" | "forgot" | "update";

const TITLES: Record<Mode, string> = {
  login: "Sign in",
  register: "Create account",
  forgot: "Reset password",
  update: "Choose a new password",
};

function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export function AccountsUnavailable() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-10 text-center">
      <Monogram className="w-[72px]" sizes="72px" />
      <h1 className="text-[1.5rem] font-light">Accounts open soon</h1>
      <p className="muted text-[0.9375rem]">
        Customer accounts aren’t switched on yet. Your bag and wishlist are saved on this device in the meantime.
      </p>
      <Link href="/wishlist" className="btn btn-line">
        View wishlist
      </Link>
    </div>
  );
}

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const sb = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!sb) return <AccountsUnavailable />;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const target = safeNext(next);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode !== "update" && !isValidEmail(email)) return setError("Enter a valid email address.");
    if ((mode === "login" || mode === "register" || mode === "update") && password.length < (mode === "login" ? 1 : 8)) {
      return setError(mode === "login" ? "Enter your password." : "Use at least 8 characters for your password.");
    }
    if ((mode === "register" || mode === "update") && password !== confirm) return setError("The passwords don’t match.");

    setPending(true);
    try {
      if (mode === "login") {
        const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        router.replace(target);
        router.refresh();
        return;
      }
      if (mode === "register") {
        const { data, error: err } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(target)}` },
        });
        if (err) throw err;
        if (data.session) {
          router.replace(target);
          router.refresh();
          return;
        }
        setNotice("Check your inbox to confirm your email address, then sign in.");
      }
      if (mode === "forgot") {
        const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${origin}/auth/callback?next=/account/update-password`,
        });
        if (err) throw err;
        setNotice("If an account exists for that address, a reset link is on its way.");
      }
      if (mode === "update") {
        const { error: err } = await sb.auth.updateUser({ password });
        if (err) throw err;
        setNotice("Password updated.");
        router.replace("/account");
        router.refresh();
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(
        /invalid login credentials/i.test(message)
          ? "That email and password don’t match an account."
          : /already registered/i.test(message)
            ? "An account with this email already exists. Sign in instead."
            : message,
      );
    }
    setPending(false);
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <Monogram className="mx-auto w-[64px]" sizes="64px" />
      <h1 className="page-title mt-8 text-center">{TITLES[mode]}</h1>
      {notice ? (
        <p role="status" className="mt-8 text-center text-[0.9375rem]">
          {notice}
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-10 flex flex-col gap-6">
          {mode !== "update" && (
            <div>
              <label htmlFor="auth-email" className="label">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
          {mode !== "forgot" && (
            <div>
              <label htmlFor="auth-password" className="label">
                {mode === "update" ? "New password" : "Password"}
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}
          {(mode === "register" || mode === "update") && (
            <div>
              <label htmlFor="auth-confirm" className="label">
                Confirm password
              </label>
              <input
                id="auth-confirm"
                type="password"
                autoComplete="new-password"
                className="field"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-solid btn-block" disabled={pending}>
            {pending ? "Please wait…" : TITLES[mode]}
          </button>
        </form>
      )}
      <div className="muted mt-8 flex flex-col items-center gap-3 text-[0.8125rem]">
        {mode === "login" && (
          <>
            <Link href="/account/forgot-password" className="text-link">
              Forgot your password?
            </Link>
            <p>
              New here?{" "}
              <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-link text-bone">
                Create an account
              </Link>
            </p>
          </>
        )}
        {(mode === "register" || mode === "forgot") && (
          <Link href="/account/login" className="text-link">
            Back to sign in
          </Link>
        )}
        {mode !== "update" && (
          <p className="max-w-xs text-center text-[0.75rem]">Accounts are optional. You can always check out as a guest.</p>
        )}
      </div>
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="text-link muted text-[0.8125rem]"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await getBrowserSupabase()?.auth.signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
