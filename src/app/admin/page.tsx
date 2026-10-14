import Link from "next/link";
import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { adminProducts, adminSettings, adminZones } from "@/lib/server/admin-data";
import { requireAdmin } from "@/lib/server/auth";
import { getReadiness } from "@/lib/server/readiness";
import { paymentsReady } from "@/lib/server/payments";

export default async function AdminOverview() {
  const { supabase } = await requireAdmin();
  const [products, settings, zones, subs, orders] = await Promise.all([
    adminProducts(supabase),
    adminSettings(supabase),
    adminZones(supabase),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
  ]);
  const items = getReadiness({ settings, products, zones, webhookReady: await paymentsReady() });

  return (
    <>
      <AdminHead title="Overview">
        The store is in <strong className="text-bone">{settings.mode === "live" ? "live" : "prelaunch"}</strong> mode.{" "}
        {settings.mode === "live" ? (
          <Link href="/admin/launch" className="text-link">Launch settings</Link>
        ) : (
          <>
            When the checklist below is done,{" "}
            <Link href="/admin/launch" className="text-link">release Drop 001</Link>.
          </>
        )}
      </AdminHead>
      <div className="mb-8 grid max-w-4xl grid-cols-3 gap-px border border-rule bg-rule">
        {[
          ["Products", products.length, "/admin/products"],
          ["Subscribers", subs.count ?? 0, "/admin/newsletter"],
          ["Orders", orders.count ?? 0, "/admin/orders"],
        ].map(([label, n, href]) => (
          <Link key={label as string} href={href as string} className="bg-surface p-5 hover:bg-[var(--surface-hover)]">
            <p className="text-[1.75rem] font-light tabular-nums">{n}</p>
            <p className="muted text-[0.75rem]">{label}</p>
          </Link>
        ))}
      </div>
      <Panel title="Launch checklist">
        <ul className="divide-y divide-rule">
          {items.map((it) => (
            <li key={it.label} className="flex gap-4 py-3.5">
              <span
                aria-hidden="true"
                className={`mt-1.5 h-2 w-2 flex-none rounded-full ${it.ok ? "bg-bone" : it.optional ? "bg-charcoal ring-1 ring-silver" : "bg-[#c97a7a]"}`}
              />
              <div>
                <p className="text-[0.875rem]">
                  {it.label} <span className="sr-only">{it.ok ? "(done)" : "(to do)"}</span>
                  {it.optional && <span className="muted text-[0.75rem]"> — optional</span>}
                </p>
                <p className="muted text-[0.8125rem]">{it.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
