import { AdminHead } from "@/components/admin/AdminHead";
import { ConfirmButton } from "@/components/admin/AdminUI";
import { requireAdmin } from "@/lib/server/auth";
import { formatDate } from "@/lib/shared/format";
import { deleteSubscriber } from "../actions";

export default async function NewsletterAdmin() {
  const { supabase } = await requireAdmin();
  const [{ data, count }, { data: restock }, { data: variants }] = await Promise.all([
    supabase
      .from("newsletter_subscribers")
      .select("id, email, source, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("restock_requests").select("id, email, variant_id, created_at, notified_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("product_variants").select("id, size, products(name)"),
  ]);
  const sizeName = (id: string) => {
    const v = (variants ?? []).find((x) => x.id === id) as { size: string; products?: { name?: string } | { name?: string }[] | null } | undefined;
    const p = Array.isArray(v?.products) ? v?.products[0] : v?.products;
    return v ? `${p?.name ?? "Piece"} — ${v.size}` : "A size that was removed";
  };
  const waiting = (restock ?? []).filter((r) => !r.notified_at);
  return (
    <>
      <AdminHead title="Newsletter">
        {count ?? 0} people have joined. Export the list as CSV to import into your email service (for example Klaviyo, Mailchimp
        or Resend), which handles sending and unsubscribe links.
      </AdminHead>
      <a href="/admin/newsletter/export" className="btn btn-line mb-8">Download CSV</a>
      <div className="max-w-4xl overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[0.875rem]">
          <thead className="muted text-[0.75rem]">
            <tr className="border-b border-rule">
              <th className="py-3 font-normal">Email</th>
              <th className="py-3 font-normal">Joined</th>
              <th className="py-3 font-normal">Source</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody>
            {data?.map((s) => (
              <tr key={s.id} className="border-b border-rule">
                <td className="py-3 pr-4 break-all">{s.email}</td>
                <td className="py-3 pr-4">{formatDate(s.created_at)}</td>
                <td className="muted py-3 pr-4">{s.source ?? "—"}</td>
                <td className="py-3 text-right">
                  <form action={deleteSubscriber}>
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmButton message={`Remove ${s.email} from the list?`}>Remove</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <p className="muted mt-6">No signups yet.</p>}
      </div>

      <h2 className="mt-16 text-[1rem]">Back-in-stock requests</h2>
      <p className="muted mt-2 max-w-2xl text-[0.8125rem] leading-relaxed">
        Shoppers who asked for one email when a sold-out size returns. Raising that size’s stock under Products emails them
        automatically (once email is set up); until then, these are the people to tell. {waiting.length} waiting.
      </p>
      <div className="mt-6 max-w-4xl overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[0.875rem]">
          <thead className="muted text-[0.75rem]">
            <tr className="border-b border-rule">
              <th className="py-3 font-normal">Email</th>
              <th className="py-3 font-normal">Piece and size</th>
              <th className="py-3 font-normal">Asked</th>
              <th className="py-3 font-normal">Emailed</th>
            </tr>
          </thead>
          <tbody>
            {(restock ?? []).map((r) => (
              <tr key={r.id} className="border-b border-rule">
                <td className="py-3 pr-4 break-all">{r.email}</td>
                <td className="py-3 pr-4">{sizeName(r.variant_id)}</td>
                <td className="py-3 pr-4">{formatDate(r.created_at)}</td>
                <td className="muted py-3 pr-4">{r.notified_at ? formatDate(r.notified_at) : "Waiting"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!restock?.length && <p className="muted mt-6">No requests yet.</p>}
      </div>
    </>
  );
}
