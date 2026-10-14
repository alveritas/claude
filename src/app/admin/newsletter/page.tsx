import { AdminHead } from "@/components/admin/AdminHead";
import { ConfirmButton } from "@/components/admin/AdminUI";
import { requireAdmin } from "@/lib/server/auth";
import { formatDate } from "@/lib/shared/format";
import { deleteSubscriber } from "../actions";

export default async function NewsletterAdmin() {
  const { supabase } = await requireAdmin();
  const { data, count } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, source, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(500);
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
    </>
  );
}
