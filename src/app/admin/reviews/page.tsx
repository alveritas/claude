import Link from "next/link";
import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { AdminForm } from "@/components/admin/AdminUI";
import { requireAdmin } from "@/lib/server/auth";
import { getServiceSupabase } from "@/lib/server/supabase";
import { formatDate } from "@/lib/shared/format";
import { FIT_LABELS, HIDE_REASONS } from "@/lib/shared/reviews";
import { setReviewVisibility } from "../actions";

type Row = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  size: string | null;
  color: string | null;
  fit: keyof typeof FIT_LABELS | null;
  status: "published" | "hidden";
  hidden_reason: string | null;
  created_at: string;
  products: { name: string; slug: string } | null;
  orders: { order_number: string } | null;
};

export default async function ReviewsAdmin() {
  await requireAdmin();
  // Full rows (with the order they came from) are read with the server's key, after the admin check.
  const sb = getServiceSupabase();
  const { data, error } = sb
    ? await sb
        .from("reviews")
        .select("id, rating, title, body, author, size, color, fit, status, hidden_reason, created_at, products(name, slug), orders(order_number)")
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: null, error: { message: "The Supabase secret key is missing." } };
  const rows = (data ?? []) as unknown as Row[];
  const published = rows.filter((r) => r.status === "published");
  const avg = published.length ? (published.reduce((s, r) => s + r.rating, 0) / published.length).toFixed(1) : null;
  return (
    <>
      <AdminHead title="Reviews">
        Every review comes from a customer’s own link, sent with their shipping email (and shown on each order in Orders), so
        each one is tied to a real paid order. They go live straight away. You can hide a review that breaks the rules, but
        not because it’s critical: removing honest negative reviews isn’t allowed under the FTC’s rules on reviews.
      </AdminHead>
      {error && <p className="form-error mb-6">Reviews couldn’t load: {error.message}. Redeploy once so the database gets the reviews table.</p>}
      <p className="muted mb-8 text-[0.8125rem]">
        {published.length} published{avg ? ` · average ${avg} stars` : ""} · {rows.length - published.length} hidden
      </p>
      {!rows.length && !error && <p className="muted">No reviews yet. They’ll appear here as customers leave them.</p>}
      {rows.map((r) => (
        <Panel key={r.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-3 text-[0.8125rem]">
            <p>
              <span className="tabular-nums">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              {r.products && (
                <>
                  {" · "}
                  <Link href={`/products/${r.products.slug}#reviews`} className="text-link">{r.products.name}</Link>
                </>
              )}
            </p>
            <p className="muted">
              {formatDate(r.created_at)}
              {r.orders ? ` · Order ${r.orders.order_number}` : ""}
            </p>
          </div>
          {r.title && <p className="mt-3 font-medium">{r.title}</p>}
          <p className="mt-2 whitespace-pre-line text-[0.875rem] leading-relaxed">{r.body}</p>
          <p className="muted mt-3 text-[0.75rem]">
            {r.author}
            {r.size ? ` · Size ${r.size}` : ""}
            {r.color ? ` · ${r.color}` : ""}
            {r.fit ? ` · ${FIT_LABELS[r.fit]}` : ""}
          </p>
          <div className="mt-5 border-t border-rule pt-5">
            {r.status === "published" ? (
              <AdminForm action={setReviewVisibility} submitLabel="Hide review">
                <input type="hidden" name="id" value={r.id} />
                <label className="label" htmlFor={`why-${r.id}`}>Reason</label>
                <select id={`why-${r.id}`} name="reason" className="select" defaultValue="">
                  <option value="" disabled>Choose a reason</option>
                  {HIDE_REASONS.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </AdminForm>
            ) : (
              <AdminForm action={setReviewVisibility} submitLabel="Show again">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="show" value="1" />
                <p className="muted text-[0.8125rem]">Hidden: {r.hidden_reason ?? "no reason given"}</p>
              </AdminForm>
            )}
          </div>
        </Panel>
      ))}
    </>
  );
}
