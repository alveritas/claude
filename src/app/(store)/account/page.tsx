import Link from "next/link";
import { AccountsUnavailable, SignOutButton } from "@/components/account/AuthForm";
import { requireUser } from "@/lib/server/auth";
import { hasSupabase } from "@/lib/server/env";
import { formatDate, formatPrice } from "@/lib/shared/format";

const STATUS: Record<string, string> = {
  awaiting_payment: "Awaiting Cash App payment",
  paid: "Confirmed",
  fulfilled: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  refunded: "Refunded",
  canceled: "Canceled",
};

export default async function AccountPage() {
  if (!hasSupabase()) return <AccountsUnavailable />;
  const { supabase, user } = await requireUser("/account");
  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle(),
    supabase
      .from("orders")
      .select("id, order_number, status, currency, total_cents, created_at, tracking_url, tracking_number, carrier, order_items(name, size, quantity)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="grid gap-14 md:grid-cols-[220px_1fr]">
      <aside className="flex flex-col gap-3 text-[0.875rem]">
        <p className="muted text-[0.75rem]">Signed in as</p>
        <p className="break-all">{profile?.full_name || user.email}</p>
        <nav aria-label="Account" className="mt-6 flex flex-col gap-3">
          <Link href="/account" className="text-bone">Orders</Link>
          <Link href="/account/addresses" className="muted hover:text-bone">Addresses</Link>
          <Link href="/wishlist" className="muted hover:text-bone">Wishlist</Link>
          <Link href="/account/settings" className="muted hover:text-bone">Settings</Link>
          {profile?.role === "admin" && <Link href="/admin" className="muted hover:text-bone">Admin</Link>}
        </nav>
        <div className="mt-6"><SignOutButton /></div>
      </aside>
      <section aria-labelledby="orders">
        <h1 id="orders" className="page-title">Orders</h1>
        {!orders?.length ? (
          <div className="mt-8 flex flex-col items-start gap-5">
            <p className="muted">No orders yet.</p>
            <Link href="/shop" className="btn btn-line">Explore the collection</Link>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-rule border-y border-rule">
            {orders.map((o) => (
              <li key={o.id} className="grid gap-2 py-6 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-[0.9375rem]">Order {o.order_number}</p>
                  <p className="muted text-[0.8125rem]">{formatDate(o.created_at)} · {STATUS[o.status] ?? o.status}</p>
                  <ul className="muted mt-2 text-[0.8125rem]">
                    {(o.order_items ?? []).map((it: { name: string; size: string | null; quantity: number }, i: number) => (
                      <li key={i}>{it.name}{it.size ? ` — ${it.size}` : ""} × {it.quantity}</li>
                    ))}
                  </ul>
                  {o.tracking_url && (
                    <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" className="text-link mt-3 inline-block text-[0.8125rem]">
                      Track parcel{o.carrier ? ` (${o.carrier})` : ""}
                    </a>
                  )}
                </div>
                <p className="text-[0.9375rem] tabular-nums">{formatPrice(o.total_cents, o.currency)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
