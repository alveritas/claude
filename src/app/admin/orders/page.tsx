import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { AdminForm, Check, Field } from "@/components/admin/AdminUI";
import { requireAdmin } from "@/lib/server/auth";
import { activeProvider } from "@/lib/server/payments";
import { reviewUrl } from "@/lib/server/reviews";
import { syncSquareOrders } from "@/lib/server/square-orders";
import { countryName } from "@/lib/shared/countries";
import { formatDate, formatPrice } from "@/lib/shared/format";
import { updateOrder } from "../actions";

const STATUSES = ["paid", "fulfilled", "shipped", "delivered", "refunded", "canceled"];

export default async function OrdersAdmin() {
  const { supabase } = await requireAdmin();
  // Square: pick up any paid website order from the last two weeks that hasn't arrived yet.
  let synced: number | null = null;
  let syncError: string | null = null;
  if (activeProvider() === "square") {
    try {
      synced = await syncSquareOrders(14);
    } catch (e) {
      syncError = e instanceof Error ? e.message : String(e);
    }
  }
  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(name, size, color, quantity, unit_price_cents)")
    .order("created_at", { ascending: false })
    .limit(100);
  const reviewable = ["paid", "fulfilled", "shipped", "delivered"];
  const links = new Map<string, string | null>(
    await Promise.all(
      (orders ?? []).map(async (o) => [o.id, o.livemode !== false && reviewable.includes(o.status) ? await reviewUrl(o.id) : null] as const),
    ),
  );
  return (
    <>
      <AdminHead title="Orders">
        Orders are recorded as soon as a payment succeeds, and stock goes down at the same moment. Refunds are made in your
        payment dashboard (Square: Transactions); the status here updates automatically. Marking an order Shipped emails the
        customer their tracking link and review link.
      </AdminHead>
      {synced ? <p className="mb-6 text-[0.875rem]">Added {synced} paid order{synced === 1 ? "" : "s"} from Square.</p> : null}
      {syncError && <p className="form-error mb-6">Couldn’t check Square for new orders: {syncError}</p>}
      {!orders?.length && <p className="muted">No orders yet.</p>}
      {orders?.map((o) => {
        const a = o.shipping_address as { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } | null;
        return (
          <Panel key={o.id} title={`${o.livemode === false ? "Test order" : "Order"} ${o.order_number} — ${formatPrice(o.total_cents, o.currency)}`}>
            <div className="grid gap-6 text-[0.8125rem] md:grid-cols-3">
              <div>
                <p className="muted">Placed</p>
                <p>{formatDate(o.created_at)}</p>
                <p className="muted mt-3">Customer</p>
                <p className="break-all">{o.email ?? "—"}</p>
                {o.phone && <p>{o.phone}</p>}
                {o.livemode === false && <p className="muted mt-3">A test payment. Stock wasn’t changed.</p>}
                {o.payment_provider === "square" && <p className="muted mt-3">Paid through Square</p>}
                {o.stock_issue && <p className="form-error mt-3">Stock was short for at least one item. Check inventory.</p>}
                {o.note && <p className="form-error mt-3">{o.note}</p>}
                {links.get(o.id) && (
                  <label className="mt-3 block">
                    <span className="muted">Review link (sent with the shipping email)</span>
                    <input readOnly value={links.get(o.id) ?? ""} className="field mt-1 text-[0.75rem]" aria-label={`Review link for order ${o.order_number}`} />
                  </label>
                )}
              </div>
              <div>
                <p className="muted">Ship to</p>
                <address className="not-italic">
                  {o.shipping_name}<br />
                  {a?.line1}{a?.line2 ? `, ${a.line2}` : ""}<br />
                  {[a?.city, a?.state, a?.postal_code].filter(Boolean).join(", ")}<br />
                  {a?.country ? countryName(a.country) : ""}
                </address>
              </div>
              <div>
                <p className="muted">Items</p>
                <ul>
                  {(o.order_items ?? []).map((it: { name: string; size: string | null; quantity: number; unit_price_cents: number }, i: number) => (
                    <li key={i}>{it.name}{it.size ? ` — ${it.size}` : ""} × {it.quantity}</li>
                  ))}
                </ul>
                <p className="muted mt-3">
                  Subtotal {formatPrice(o.subtotal_cents, o.currency)} · Shipping {formatPrice(o.shipping_cents, o.currency)}
                  {o.tax_cents ? ` · Tax ${formatPrice(o.tax_cents, o.currency)}` : ""}
                  {o.discount_cents ? ` · Discount −${formatPrice(o.discount_cents, o.currency)}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-6 border-t border-rule pt-6">
              <AdminForm action={updateOrder} submitLabel="Update order">
                <input type="hidden" name="id" value={o.id} />
                <div className="grid gap-6 md:grid-cols-4">
                  <div>
                    <label className="label" htmlFor={`st-${o.id}`}>Status</label>
                    <select id={`st-${o.id}`} name="status" defaultValue={o.status} className="select w-full">
                      {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <Field label="Carrier" name="carrier" defaultValue={o.carrier} />
                  <Field label="Tracking number" name="tracking_number" defaultValue={o.tracking_number} />
                  <Field label="Tracking link" name="tracking_url" defaultValue={o.tracking_url} placeholder="https://" />
                </div>
                <div className="mt-5">
                  <Check label="Email the customer when marking as shipped" name="notify" defaultChecked />
                </div>
              </AdminForm>
            </div>
          </Panel>
        );
      })}
    </>
  );
}
