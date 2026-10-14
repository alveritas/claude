import { AuthForm } from "@/components/account/AuthForm";
import { requireUser } from "@/lib/server/auth";
import { hasSupabase } from "@/lib/server/env";

/** Reached from the password-reset email (via /auth/callback), which signs the visitor in first. */
export default async function UpdatePasswordPage() {
  if (hasSupabase()) await requireUser("/account/update-password");
  return <AuthForm mode="update" />;
}
