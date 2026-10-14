import { formatPrice } from "@/lib/shared/format";
import { env, hasEmail } from "./env";

interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Sends through Resend's REST API. Returns false (never throws) when email isn't configured. */
export async function sendEmail(msg: Email): Promise<boolean> {
  if (!hasEmail()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!res.ok) console.error("Email send failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Email send failed", e);
    return false;
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Same look as the site: off-white page, near-black type. "only light" stops mail apps darkening it. */
function layout(title: string, body: string) {
  return `<!doctype html><html><head><meta name="color-scheme" content="only light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;background:#F4F3F0;color:#080808;font-family:Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="font-size:12px;letter-spacing:4px;color:#5D5C58;padding-bottom:32px">NEVERHOLLOW</td></tr>
<tr><td style="font-size:22px;padding-bottom:16px">${esc(title)}</td></tr>
<tr><td style="font-size:14px;line-height:22px;color:#5D5C58">${body}</td></tr>
</table></td></tr></table></body></html>`;
}

export interface OrderEmailLine {
  name: string;
  size: string | null;
  quantity: number;
  unitCents: number;
}

export function orderConfirmationEmail(args: {
  orderNumber: string;
  lines: OrderEmailLine[];
  totalCents: number;
  currency: string;
}) {
  const rows = args.lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0">${esc(l.name)}${l.size ? ` — ${esc(l.size)}` : ""} × ${l.quantity}</td><td align="right">${formatPrice(l.unitCents * l.quantity, args.currency)}</td></tr>`,
    )
    .join("");
  const html = layout(
    "Thank you. Your order is confirmed.",
    `<p>Order ${esc(args.orderNumber)}</p><table width="100%" style="color:#080808;font-size:14px">${rows}
<tr><td style="padding-top:12px;border-top:1px solid #D8D6D0">Total</td><td align="right" style="padding-top:12px;border-top:1px solid #D8D6D0">${formatPrice(args.totalCents, args.currency)}</td></tr></table>
<p>We’ll email you again when it ships.</p>`,
  );
  const text = `Your NEVERHOLLOW order ${args.orderNumber} is confirmed.\n\n${args.lines
    .map((l) => `${l.name}${l.size ? ` — ${l.size}` : ""} x${l.quantity}`)
    .join("\n")}\n\nTotal: ${formatPrice(args.totalCents, args.currency)}`;
  return { subject: `Order ${args.orderNumber} confirmed`, html, text };
}

export function shippingConfirmationEmail(args: {
  orderNumber: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  /** The buyer's own review link; only for real (live-mode) orders. */
  reviewUrl?: string | null;
}) {
  const review = args.reviewUrl
    ? `<p style="margin-top:28px">Once it arrives, tell other buyers how it fits.</p><p><a href="${esc(args.reviewUrl)}" style="display:inline-block;background:#080808;color:#F4F3F0;padding:12px 22px;text-decoration:none;font-size:12px;letter-spacing:2px">LEAVE A REVIEW</a></p>`
    : "";
  const tracking = args.trackingUrl
    ? `<p><a href="${esc(args.trackingUrl)}" style="color:#080808">Track your parcel</a></p>`
    : "";
  const html = layout(
    "Your order is on its way.",
    `<p>Order ${esc(args.orderNumber)} has shipped${args.carrier ? ` with ${esc(args.carrier)}` : ""}.</p>${
      args.trackingNumber ? `<p>Tracking number: ${esc(args.trackingNumber)}</p>` : ""
    }${tracking}${review}`,
  );
  const text = `Order ${args.orderNumber} has shipped.${args.trackingUrl ? ` Track it: ${args.trackingUrl}` : ""}${
    args.reviewUrl ? `\n\nOnce it arrives, tell other buyers how it fits: ${args.reviewUrl}` : ""
  }`;
  return { subject: `Order ${args.orderNumber} has shipped`, html, text };
}

/** Cash App orders: what to send, where, and the note to add. Sent when the order is placed. */
export function cashAppInstructionsEmail(args: {
  orderNumber: string;
  cashTag: string;
  totalCents: number;
  currency: string;
  payUrl: string;
  orderUrl: string;
}) {
  const total = formatPrice(args.totalCents, args.currency);
  const html = layout(
    "Your order is reserved. Send your payment to finish.",
    `<p>Order ${esc(args.orderNumber)}</p>
<p>In Cash App, send <strong style="color:#080808">${esc(total)}</strong> to <strong style="color:#080808">${esc(args.cashTag)}</strong> and write <strong style="color:#080808">${esc(args.orderNumber)}</strong> in the “For” note.</p>
<p><a href="${esc(args.payUrl)}" style="display:inline-block;background:#080808;color:#F4F3F0;padding:12px 22px;text-decoration:none;font-size:12px;letter-spacing:2px">OPEN CASH APP</a></p>
<p>We ship once the payment arrives and email you when it’s on its way. Orders that aren’t paid within 48 hours are cancelled.</p>
<p>Only ever send money to ${esc(args.cashTag)}. We never ask you to pay anyone else. <a href="${esc(args.orderUrl)}" style="color:#080808">View your order</a></p>`,
  );
  const text = `Order ${args.orderNumber} is reserved.\n\nIn Cash App, send ${total} to ${args.cashTag} and write ${args.orderNumber} in the "For" note: ${args.payUrl}\n\nWe ship once the payment arrives. Orders that aren't paid within 48 hours are cancelled. Only ever send money to ${args.cashTag}.\n\nYour order: ${args.orderUrl}`;
  return { subject: `Order ${args.orderNumber}: send ${total} to ${args.cashTag}`, html, text };
}
