import type { ReactNode } from "react";
import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { AdminForm } from "@/components/admin/AdminUI";
import {
  ensureSquareWebhook,
  lastSquareEvent,
  squareLocation,
  squareMode,
  squareWebhookKeys,
  squareWebhookUrl,
} from "@/lib/server/square";
import { reconnectSquare } from "../actions";

const ext = { target: "_blank", rel: "noopener noreferrer", className: "text-link" } as const;

function Row({ label, ok, children }: { label: string; ok: boolean | null; children: ReactNode }) {
  return (
    <li className="flex gap-4 py-3 text-[0.875rem]">
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 flex-none rounded-full ${ok === null ? "bg-charcoal ring-1 ring-silver" : ok ? "bg-bone" : "bg-[#c97a7a]"}`}
      />
      <span className="w-44 flex-none">{label}</span>
      <span className="muted min-w-0">{children}</span>
    </li>
  );
}

/** How to connect Square: four steps, then the site does the rest by itself. */
export function SquareSetup() {
  return (
    <>
      <AdminHead title="Payments">
        Customers pay on Square’s secure checkout page with card, Apple Pay, Google Pay or Cash App Pay. Card details never
        touch this site.
      </AdminHead>
      <Panel title="Connect Square">
        <ol className="flex list-decimal flex-col gap-3 pl-5 text-[0.875rem] leading-relaxed">
          <li>
            Sign up at{" "}
            <a href="https://squareup.com/signup" {...ext}>
              squareup.com/signup
            </a>{" "}
            and finish the questions about you and your bank account, so Square can pay you out.
          </li>
          <li>
            Open{" "}
            <a href="https://developer.squareup.com/apps" {...ext}>
              developer.squareup.com/apps
            </a>
            , sign in with the same account, press <strong className="font-medium">+</strong> and name the app “NEVERHOLLOW
            website”.
          </li>
          <li>
            In the app, switch the toggle at the top to <strong className="font-medium">Production</strong>, open{" "}
            <strong className="font-medium">Credentials</strong> and copy the <strong className="font-medium">Production Access token</strong>.
          </li>
          <li>
            In Netlify: Site configuration → Environment variables → add <code>SQUARE_ACCESS_TOKEN</code> with that token, then
            Deploys → Trigger deploy.
          </li>
        </ol>
        <p className="muted mt-5 text-[0.8125rem] leading-relaxed">
          That’s all. On that deploy the site connects order notifications with Square by itself and opens for sale.
        </p>
      </Panel>
    </>
  );
}

export async function SquarePayments() {
  const mode = squareMode();
  const [location, webhook, keys, last] = await Promise.all([
    squareLocation().then(
      (l) => ({ ok: true as const, l }),
      (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }),
    ),
    ensureSquareWebhook(),
    squareWebhookKeys(),
    lastSquareEvent(),
  ]);
  const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : null;
  return (
    <>
      <AdminHead title="Payments">
        Customers pay on Square’s secure checkout page with card, Apple Pay, Google Pay or Cash App Pay. Card details never
        touch this site. You’re using <strong className="text-bone">{mode === "live" ? "live" : "sandbox (test)"}</strong>{" "}
        {mode === "live" ? "credentials: payments are real." : "credentials: only Square’s test cards work."}
      </AdminHead>

      <Panel title="Square account">
        <ul className="divide-y divide-rule">
          <Row label="Connection" ok={location.ok}>
            {location.ok
              ? `Connected to “${location.l.name ?? "your location"}”${location.l.currency ? ` (${location.l.currency})` : ""}.`
              : `Square didn’t accept the access token: ${location.error} Copy the Production Access token again and update SQUARE_ACCESS_TOKEN.`}
          </Row>
          <Row label="Card payments" ok={location.ok ? Boolean(location.l.capabilities?.includes("CREDIT_CARD_PROCESSING")) : null}>
            {location.ok && location.l.capabilities?.includes("CREDIT_CARD_PROCESSING")
              ? "Ready. Card, Apple Pay, Google Pay and Cash App Pay show on the checkout page."
              : "Square hasn’t enabled card processing for this account yet. Finish the identity and bank questions in your Square Dashboard."}
          </Row>
        </ul>
      </Panel>

      <Panel title="Order notifications">
        <p className="muted mb-4 max-w-2xl text-[0.8125rem] leading-relaxed">
          Square tells the site about each payment. That records the order, lowers stock and sends the confirmation email.
          It’s connected automatically; orders are also picked up when a buyer returns from checkout and when you open Orders.
        </p>
        <ul className="divide-y divide-rule">
          <Row label="Status" ok={webhook.ok && keys.length > 0}>
            {webhook.ok && keys.length > 0 ? "Connected." : `Not connected yet${webhook.error ? `: ${webhook.error}` : "."}`}
          </Row>
          <Row label="Address" ok={null}>
            <code className="break-all">{squareWebhookUrl()}</code>
          </Row>
          <Row label="Last event received" ok={null}>
            {when(last) ?? "None yet."}
          </Row>
        </ul>
        <AdminForm action={reconnectSquare} submitLabel="Reconnect order notifications">
          <span />
        </AdminForm>
        {!(webhook.ok && keys.length > 0) && (
          <p className="muted mt-4 text-[0.8125rem] leading-relaxed">
            If it won’t connect: in developer.squareup.com → your app → Webhooks → Subscriptions (Production), add a subscription
            with the address above and the events payment.created, payment.updated, refund.created and refund.updated, then copy
            its Signature key into <code>SQUARE_WEBHOOK_SIGNATURE_KEY</code> and redeploy.
          </p>
        )}
      </Panel>

      <Panel title="Payment methods">
        <p className="text-[0.875rem] leading-relaxed">
          Card, Apple Pay (Safari on iPhone, iPad and Mac), Google Pay and Cash App Pay are offered on every checkout. Refunds
          are made in your Square Dashboard (Transactions → the payment → Issue refund); the order here updates to Refunded by
          itself.
        </p>
      </Panel>
    </>
  );
}
