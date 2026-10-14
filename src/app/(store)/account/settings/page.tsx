import Link from "next/link";
import { AccountsUnavailable, AuthForm, SignOutButton } from "@/components/account/AuthForm";
import { ProfileForm } from "@/components/account/AccountForms";
import { requireUser } from "@/lib/server/auth";
import { hasSupabase } from "@/lib/server/env";
import { saveProfile } from "../actions";

export default async function SettingsPage() {
  if (!hasSupabase()) return <AccountsUnavailable />;
  const { supabase, user } = await requireUser("/account/settings");
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  return (
    <div className="max-w-3xl">
      <Link href="/account" className="text-link muted text-[0.75rem]">Back to account</Link>
      <h1 className="page-title mt-6">Settings</h1>
      <section className="mt-10 border-t border-rule pt-8">
        <h2 className="mb-6 text-[1.125rem] font-light">Profile</h2>
        <p className="muted mb-6 text-[0.875rem]">Email: {user.email}</p>
        <ProfileForm action={saveProfile} name={profile?.full_name ?? ""} />
      </section>
      <section className="mt-14 border-t border-rule pt-8">
        <AuthForm mode="update" />
      </section>
      <section className="mt-14 border-t border-rule pt-8">
        <SignOutButton />
      </section>
    </div>
  );
}
