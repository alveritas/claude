import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { paypalEmail, paypalMode, paypalNotifyUrl } from "@/lib/server/paypal";

/** PayPal needs nothing but the receiving email, so this page only explains how it works. */
export function PayPalPayments() {
  const mode = paypalMode();
  return (
    <>
      <AdminHead title="Payments">
        Customers pay on PayPal’s secure page with a debit or credit card or their PayPal account. Card details never touch
        this site. {mode === "test" ? "PayPal sandbox (test) mode: payments aren’t real." : "Payments are real."}
      </AdminHead>
      <Panel title="PayPal">
        <ul className="flex flex-col gap-3 text-[0.875rem] leading-relaxed">
          <li>
            Payments go to <strong className="font-medium text-bone">{paypalEmail()}</strong>. To change it, set{" "}
            <code>PAYPAL_EMAIL</code> in your host’s environment variables (or edit src/data/launch.ts) and redeploy.
          </li>
          <li>
            Each paid order is confirmed by PayPal at <code className="break-all">{paypalNotifyUrl()}</code>, then recorded
            under Orders with the buyer’s address, and stock goes down. PayPal also emails you every payment.
          </li>
          <li>
            The amount paid is checked against your prices; if it doesn’t match, the order shows a warning under Orders so you
            don’t ship it by mistake.
          </li>
          <li>
            Refunds: PayPal → Activity → the payment → Issue a refund. The order here turns Refunded by itself.
          </li>
          <li className="muted">
            If PayPal asks you to upgrade to a free Business account when the first payment comes in, say yes: it lets buyers
            pay by card without a PayPal account.
          </li>
        </ul>
      </Panel>
    </>
  );
}
