import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Monogram } from "@/components/brand/Brand";
import { requireAdmin } from "@/lib/server/auth";
import { hasSupabase } from "@/lib/server/env";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "Overview"],
  ["/admin/launch", "Launch"],
  ["/admin/payments", "Payments"],
  ["/admin/products", "Products"],
  ["/admin/collections", "Collections"],
  ["/admin/content", "Content"],
  ["/admin/shipping", "Shipping"],
  ["/admin/orders", "Orders"],
  ["/admin/reviews", "Reviews"],
  ["/admin/newsletter", "Newsletter"],
  ["/admin/promotions", "Promotions"],
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!hasSupabase()) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-16">
        <Monogram className="w-16" sizes="64px" />
        <h1 className="text-[1.75rem] font-light">Connect Supabase to open the admin</h1>
        <p className="muted text-[0.9375rem] leading-relaxed">
          The admin dashboard stores products, content and settings in Supabase. Connect Supabase to the site (Vercel: Storage
          tab; Netlify: Extensions → Supabase, plus <code>DATABASE_URL</code>) and redeploy: the site creates its own tables during
          that build. Sign up with the email in <code>ADMIN_EMAIL</code> and you’re the admin. SETUP.md has each step.
        </p>
        <Link href="/" className="btn btn-line self-start">Back to the store</Link>
      </div>
    );
  }
  const { user } = await requireAdmin();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-rule bg-surface md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-5 md:flex-col md:items-start">
          <Link href="/admin" className="flex items-center gap-3">
            <Monogram className="w-10" sizes="40px" />
            <span className="caps">Admin</span>
          </Link>
          <Link href="/" className="text-link muted text-[0.75rem]">View store</Link>
        </div>
        <nav aria-label="Admin" className="no-scrollbar flex gap-5 overflow-x-auto px-5 pb-4 text-[0.875rem] md:flex-col md:gap-1 md:pb-0">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap py-1.5 text-silver hover:text-bone">
              {label}
            </Link>
          ))}
        </nav>
        <p className="muted hidden break-all px-5 pt-8 text-[0.6875rem] md:block">{user.email}</p>
      </aside>
      <main className="min-w-0 px-5 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}
