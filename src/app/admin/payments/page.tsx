import type { ReactNode } from "react";
import type Stripe from "stripe";
import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { AdminForm, Check, Field } from "@/components/admin/AdminUI";
import { adminSettings } from "@/lib/server/admin-data";
import { requireAdmin } from "@/lib/server/auth";
import { env, hasServiceRole } from "@/lib/server/env";
import {
  getStripe,
  hasStoredWebhookSecret,
  isOwnStaleEndpoint,
  lastWebhookEvent,
  paymentMethodStatus,
  stripeMode,
  WEBHOOK_EVENTS,
  webhookUrl,
  webhookUrlIsPublic,
} from "@/lib/server/stripe";
import { connectWebhook, enableStoreWallets, savePaymentSettings } from "../actions";
import { activeProvider } from "@/lib/server/payments";
import { SquarePayments, SquareSetup } from "./SquarePanel";

export const dynamic = "force-dynamic";

function Row({ label, ok, children }: { label: string; ok: boolean | null; children: ReactNode }) {
  return (
    <li className="flex gap-4 py-3">
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 flex-none rounded-full ${ok === null ? "bg-charcoal ring-1 ring-silver" : ok ? "bg-bone" : "bg-[#c97a7a]"}`}
      />
      <div className="text-[0.875rem]">
        <p>
          {label} {ok !== null && <span className="sr-only">{ok ? "(ok)" : "(needs attention)"}</span>}
        </p>
        <div className="muted text-[0.8125rem]">{children}</div>
      </div>
    </li>
  );
}

const ext = { target: "_blank", rel: "noopener noreferrer", className: "text-link" } as const;

function hostOf(u: string) {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
}

function when(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

export default async function PaymentsAdmin() {
  const { supabase } = await requireAdmin();
  // Square is the store's payment company; Stripe stays only as a fallback if it's the one set up.
  const provider = activeProvider();
  if (provider === "square") return <SquarePayments />;
  if (!provider) return <SquareSetup />;
  const settings = await adminSettings(supabase);
  const stripe = getStripe();
  const mode = stripeMode();
  const dash = mode === "test" ? "https://dashboard.stripe.com/test" : "https://dashboard.stripe.com";

  if (!stripe || !mode) {
    return (
      <>
        <AdminHead title="Payments">Customers pay on Stripe’s secure checkout page. Card details never touch this site.</AdminHead>
        <Panel title="Connect Stripe">
          <ol className="flex list-decimal flex-col gap-3 pl-5 text-[0.875rem] leading-relaxed">
            <li>
              In Stripe, open{" "}
              <a href="https://dashboard.stripe.com/test/apikeys" {...ext}>
                Developers → API keys
              </a>{" "}
              (test mode first) and copy the <strong className="font-medium">Secret key</strong> (it starts with sk_test_).
            </li>
            <li>
              In your host (Vercel: Settings → Environment Variables; Netlify: Site configuration → Environment variables), add <code>STRIPE_SECRET_KEY</code> with that
              value, then redeploy.
            </li>
            <li>Come back here and press “Connect order webhook”.</li>
          </ol>
          {env.stripeSecretKey && !mode && (
            <p className="form-error mt-4">STRIPE_SECRET_KEY is set but doesn’t look like a Stripe secret key (sk_test_… or sk_live_…).</p>
          )}
        </Panel>
      </>
    );
  }

  const url = webhookUrl();
  const [accountRes, endpointsRes, taxRes, stored, lastEvent, methodsRes] = await Promise.allSettled([
    stripe.accounts.retrieve(),
    stripe.webhookEndpoints.list({ limit: 100 }),
    stripe.tax.settings.retrieve(),
    hasStoredWebhookSecret(mode),
    lastWebhookEvent(mode),
    paymentMethodStatus(stripe),
  ]);
  const methods = methodsRes.status === "fulfilled" ? methodsRes.value : null;
  const methodsError = methodsRes.status === "rejected" ? String((methodsRes.reason as Error)?.message ?? methodsRes.reason) : null;
  const walletsOff = (methods ?? []).filter((m) => (m.key === "apple_pay" || m.key === "cashapp") && !m.on);
  const account = accountRes.status === "fulfilled" ? (accountRes.value as Stripe.Account) : null;
  const accountError = accountRes.status === "rejected" ? String((accountRes.reason as Error)?.message ?? accountRes.reason) : null;
  const endpoints = endpointsRes.status === "fulfilled" ? (endpointsRes.value.data as Stripe.WebhookEndpoint[]) : [];
  const ours = endpoints.find((e) => e.url === url) ?? null;
  const stale = endpoints.filter((e) => isOwnStaleEndpoint(e, url));
  const missingEvents = ours
    ? WEBHOOK_EVENTS.filter((ev) => !ours.enabled_events.includes(ev) && !ours.enabled_events.includes("*"))
    : [...WEBHOOK_EVENTS];
  const secretKnown = Boolean(env.stripeWebhookSecret) || (stored.status === "fulfilled" && stored.value);
  const webhookOk = Boolean(ours && ours.status === "enabled" && missingEvents.length === 0 && secretKnown);
  const taxStatus = taxRes.status === "fulfilled" ? (taxRes.value as { status?: string }).status ?? null : null;
  const last = lastEvent.status === "fulfilled" ? when(lastEvent.value) : null;
  const due = account?.requirements?.currently_due?.length ?? 0;
  const currencyMismatch = account?.default_currency && account.default_currency !== settings.currency;

  return (
    <>
      <AdminHead title="Payments">
        Customers pay on Stripe’s secure checkout page. Card details never touch this site. You’re using{" "}
        <strong className="text-bone">{mode === "live" ? "live" : "test"}</strong> keys
        {mode === "test" ? ": checkout works, but only Stripe’s test cards are accepted." : ": payments are real."}
      </AdminHead>

      <Panel title="Stripe account">
        <ul className="divide-y divide-rule">
          {accountError ? (
            <Row label="Couldn’t reach Stripe" ok={false}>
              {accountError}
            </Row>
          ) : (
            account && (
              <>
                <Row label={account.settings?.dashboard?.display_name || account.business_profile?.name || "Your Stripe account"} ok={null}>
                  {[account.country, account.default_currency?.toUpperCase()].filter(Boolean).join(" · ")}
                </Row>
                <Row label="Can take payments" ok={account.charges_enabled}>
                  {account.charges_enabled
                    ? "Yes."
                    : <>Not yet. Finish activating your account in the <a href="https://dashboard.stripe.com" {...ext}>Stripe dashboard</a> (business details, identity and bank account).</>}
                </Row>
                <Row label="Payouts to your bank" ok={account.payouts_enabled}>
                  {account.payouts_enabled ? "Yes." : "Not yet. Add or verify your bank account in Stripe."}
                </Row>
                {due > 0 && (
                  <Row label="Stripe needs more information" ok={false}>
                    {due} item{due > 1 ? "s" : ""} to complete in the <a href="https://dashboard.stripe.com" {...ext}>Stripe dashboard</a>.
                  </Row>
                )}
                {currencyMismatch && (
                  <Row label="Currency" ok={null}>
                    The store charges in {settings.currency.toUpperCase()} and your Stripe account settles in{" "}
                    {account.default_currency?.toUpperCase()}. Stripe converts automatically, with a conversion fee.
                  </Row>
                )}
              </>
            )
          )}
        </ul>
      </Panel>

      <Panel title="Order webhook">
        <p className="muted mb-4 max-w-2xl text-[0.8125rem] leading-relaxed">
          After a customer pays, Stripe tells this site through the webhook. That’s what records the order, lowers stock and
          sends the confirmation email. Test and live mode each need their own; press the button again after switching keys.
        </p>
        <ul className="divide-y divide-rule">
          <Row label="Status" ok={webhookOk}>
            {webhookOk
              ? `Connected (${mode} mode).`
              : !hasServiceRole()
                ? "The Supabase secret (service role) key is missing, so orders can’t be saved."
                : ours && !secretKnown
                  ? "An endpoint exists in Stripe but this site doesn’t have its signing secret. Reconnect to replace it."
                  : ours && missingEvents.length
                    ? `The endpoint is missing events: ${missingEvents.join(", ")}. Reconnect to fix it.`
                    : ours && ours.status !== "enabled"
                      ? "The endpoint is disabled in Stripe. Reconnect to replace it."
                      : stale.length
                        ? `Stripe is still sending orders to your old address (${hostOf(stale[0].url)}). Press Connect to move it to this domain.`
                        : "Not connected yet."}
          </Row>
          <Row label="Address" ok={null}>
            <code className="break-all">{url}</code>
          </Row>
          <Row label="Last event received" ok={null}>
            {last ?? "None yet."}
          </Row>
        </ul>
        {webhookUrlIsPublic() ? (
          <AdminForm action={connectWebhook} submitLabel={ours ? "Reconnect order webhook" : "Connect order webhook"}>
            <span />
          </AdminForm>
        ) : (
          <p className="mt-4 text-[0.8125rem]">
            Stripe can only reach a public https address. On your computer, use the Stripe CLI instead:{" "}
            <code>stripe listen --forward-to localhost:3000/api/webhooks/stripe</code>, and put the secret it prints in{" "}
            <code>STRIPE_WEBHOOK_SECRET</code>.
          </p>
        )}
      </Panel>

      <Panel title="Checkout">
        <AdminForm action={savePaymentSettings} submitLabel="Save payment settings">
          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label="Currency"
              name="currency"
              defaultValue={settings.currency}
              hint="Three-letter code. Prices are entered and charged in this currency."
            />
          </div>
          <div className="mt-6 flex flex-col gap-4">
            <Check
              label="Allow promotion codes at checkout"
              name="allow_promotion_codes"
              defaultChecked={settings.allowPromotionCodes}
              hint="Create codes under Promotions."
            />
            <Check
              label="Calculate sales tax and VAT automatically (Stripe Tax)"
              name="automatic_tax"
              defaultChecked={settings.automaticTax}
              hint={
                taxStatus === "active"
                  ? "Stripe Tax is set up on your account."
                  : "Set up Stripe Tax and add your tax registrations in Stripe first; saving checks this."
              }
            />
          </div>
        </AdminForm>
      </Panel>

      <Panel title="Payment methods">
        <p className="muted mb-4 max-w-2xl text-[0.8125rem] leading-relaxed">
          Stripe’s checkout shows each customer the methods that are on here and that work for them: Apple Pay appears on iPhone,
          iPad and Mac (Safari), Google Pay on Android and Chrome, and Cash App Pay for US shoppers paying in US dollars. Test and
          live mode have separate settings; “Connect order webhook” switches Apple Pay and Cash App Pay on for the mode you’re in.
        </p>
        {methodsError && <p className="form-error mb-4">Couldn’t read payment methods from Stripe: {methodsError}</p>}
        {methods && (
          <ul className="divide-y divide-rule">
            {methods.map((m) => (
              <Row key={m.key} label={m.label} ok={m.available ? m.on : null}>
                {!m.available
                  ? m.key === "cashapp"
                    ? "Not available on this account yet. Stripe offers Cash App Pay to US businesses once the account is activated."
                    : "Not available on this account yet."
                  : m.on
                    ? "On."
                    : "Off."}
              </Row>
            ))}
            <Row label="Venmo" ok={null}>
              Not offered through Stripe for US businesses, so it can’t appear on this checkout.
            </Row>
          </ul>
        )}
        {walletsOff.length > 0 && (
          <AdminForm action={enableStoreWallets} submitLabel="Turn on Apple Pay and Cash App Pay">
            <span />
          </AdminForm>
        )}
        <p className="muted mt-4 text-[0.8125rem]">
          Everything else (Klarna, Afterpay, Link…) is in{" "}
          <a href={`${dash}/settings/payment_methods`} {...ext}>
            Stripe → Payment methods
          </a>
          . Cash App Pay only shows while the store currency is USD.
        </p>
      </Panel>

      {mode === "test" ? (
        <Panel title="Test a purchase">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-[0.875rem] leading-relaxed">
            <li>Make sure the store is released (Launch) and a piece has stock.</li>
            <li>Add it to the bag, choose a country and check out.</li>
            <li>
              Pay with card <code>4242 4242 4242 4242</code>, any future expiry date, any CVC and any postcode.
            </li>
            <li>You land on the order confirmation page; the order appears under Orders marked “Test”. Test orders don’t change stock.</li>
          </ol>
          <p className="muted mt-4 text-[0.8125rem]">
            When it works: in Vercel or Netlify, replace <code>STRIPE_SECRET_KEY</code> with your live secret key (sk_live_…), redeploy,
            then press “Connect order webhook” here again.
          </p>
        </Panel>
      ) : (
        <Panel title="Refunds">
          <p className="text-[0.875rem] leading-relaxed">
            Refund from the payment in{" "}
            <a href={`${dash}/payments`} {...ext}>
              Stripe → Payments
            </a>
            . The order here is marked refunded automatically. Stock isn’t put back, since sales are final; adjust it under
            Products if an item comes back.
          </p>
        </Panel>
      )}
    </>
  );
}
