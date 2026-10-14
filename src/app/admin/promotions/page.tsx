import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { AdminForm, ConfirmButton, Field } from "@/components/admin/AdminUI";
import { adminSettings } from "@/lib/server/admin-data";
import { requireAdmin } from "@/lib/server/auth";
import { activeProvider } from "@/lib/server/payments";
import { getStripe } from "@/lib/server/stripe";
import { createPromotion, deactivatePromotion } from "../actions";

export default async function PromotionsAdmin() {
  const { supabase } = await requireAdmin();
  const settings = await adminSettings(supabase);
  if (activeProvider() !== "stripe") {
    return (
      <AdminHead title="Promotions">
        Promotion codes aren’t available with Square checkout yet. To run a sale, lower the price on the products under
        Products; the old price isn’t shown as a fake “was” price.
      </AdminHead>
    );
  }
  const stripe = getStripe();
  if (!stripe) {
    return (
      <AdminHead title="Promotions">Promotion codes are created in Stripe. Add STRIPE_SECRET_KEY to manage them here.</AdminHead>
    );
  }
  let codes: { id: string; code: string; active: boolean; times_redeemed: number; label: string }[] = [];
  let loadError: string | null = null;
  try {
    const list = await stripe.promotionCodes.list({ limit: 50, expand: ["data.coupon"] });
    codes = list.data.map((pc) => {
      const c = (pc as unknown as { coupon?: { percent_off?: number | null; amount_off?: number | null; currency?: string | null } }).coupon;
      const label = c?.percent_off ? `${c.percent_off}% off` : c?.amount_off ? `${(c.amount_off / 100).toFixed(2)} ${c.currency?.toUpperCase()} off` : "";
      return { id: pc.id, code: pc.code, active: pc.active, times_redeemed: pc.times_redeemed, label };
    });
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Couldn’t load codes from Stripe.";
  }
  return (
    <>
      <AdminHead title="Promotions">
        Codes live in Stripe and are entered by customers on the Stripe checkout page.{" "}
        {settings.allowPromotionCodes ? "Promotion codes are currently allowed at checkout." : "Promotion codes are currently turned off — enable them under Launch."}
      </AdminHead>
      <Panel title="Create a code">
        <AdminForm action={createPromotion} submitLabel="Create code">
          <div className="grid gap-6 md:grid-cols-3">
            <Field label="Code" name="code" required placeholder="FIRST10" />
            <div>
              <label className="label" htmlFor="f-kind">Type</label>
              <select id="f-kind" name="kind" className="select w-full" defaultValue="percent">
                <option value="percent">Percentage off</option>
                <option value="amount">Fixed amount off</option>
              </select>
            </div>
            <Field label="Amount" name="value" required placeholder="10" hint="Percent, or amount in the store currency." />
            <Field label="Currency (fixed amounts)" name="currency" defaultValue={settings.currency} />
            <Field label="Max redemptions (optional)" name="max_redemptions" type="number" />
            <Field label="Expires (optional)" name="expires_at" type="date" />
          </div>
        </AdminForm>
      </Panel>
      <Panel title="Codes">
        {loadError && <p className="form-error">{loadError}</p>}
        {!loadError && !codes.length && <p className="muted text-[0.875rem]">No codes yet.</p>}
        <ul className="divide-y divide-rule">
          {codes.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 py-3 text-[0.875rem]">
              <span>
                <strong className="font-medium">{c.code}</strong> <span className="muted">{c.label} · used {c.times_redeemed}×</span>
              </span>
              {c.active ? (
                <form action={deactivatePromotion}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton message={`Deactivate ${c.code}?`}>Deactivate</ConfirmButton>
                </form>
              ) : (
                <span className="muted text-[0.75rem]">Inactive</span>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
